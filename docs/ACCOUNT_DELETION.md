# Account deletion and backup-safe erasure

This document describes how CNERSH deletes a user account so that the deletion
survives a database restore, what is kept and why, what operators must
configure, and what the design does not claim.

## The problem

Deleting a row from PostgreSQL does not delete it from the backups taken before
the deletion. If the database is restored from one of those backups, the
"deleted" user, their sessions and their personal data come back, and nothing
in the application knows that it should delete them again. Re-running every
deletion by hand after a restore is not a reliable control.

The UK ICO's guidance on the right to erasure says that where personal data is
held in backups, organisations must put it "beyond use" and be clear with
individuals about what will happen to the data, including backups
([ICO, Right to erasure](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-erasure/)).

## The design in one paragraph

Each user gets their own 256-bit data-encryption key (DEK). Sensitive payloads
(`Project.formData`, legacy inline `File.data`) are encrypted with that key
before they are written to the database. The DEK is wrapped with a key-
encryption key (`ERASURE_KEK`) held only in the secret manager, and stored in a
small **erasure store** that is not part of the application database's backup
set. When the account is deleted we scrub the plaintext rows, record the
deletion in a journal in the erasure store, and destroy the user's DEK. Any
copy of the ciphertext in any backup is then unreadable. After a restore, a
**reconciliation** step reads the journal and re-applies every deletion the
restore undid, so a deleted account cannot be reinstated by accident.

Destroying the only key that can decrypt data is a recognised way to make that
data permanently inaccessible; NIST describes key destruction as the point after
which protected data can no longer be recovered
([NIST SP 800-57 Part 1 Rev. 5, §8.3.4](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf)),
and cloud key services document the same consequence when a key is scheduled
for deletion
([AWS KMS, Deleting keys](https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html)).

## Components

| Area | Location |
| --- | --- |
| Key/config loading, capability flags | `src/lib/erasure/config.ts` |
| AES-256-GCM primitives, envelope format | `src/lib/erasure/crypto.ts` |
| Erasure store (raw `pg`): subject keys and journal | `src/lib/erasure/store.ts` |
| Per-subject key lifecycle (create, destroy, verify, re-wrap) | `src/lib/erasure/keys.ts` |
| Field helpers (seal/open/re-key form data and file data) | `src/lib/erasure/fields.ts` |
| Retention rules and tombstone values | `src/lib/erasure/retention-policy.ts` |
| Deletion state machine, reconciliation | `src/lib/erasure/deletion-service.ts` |
| Server actions for the settings page | `src/app/actions/account-deletion.ts` |
| Settings card and confirmation page | `src/components/delete-account.tsx`, `src/app/(auth)/account-deleted/page.tsx` |
| Admin removal (routes through the same service) | `src/app/actions/admin.ts` → `removeManagedUser` |
| Daily sweep (retry + reconcile) | `src/app/api/cron/erasure/route.ts`, `vercel.json` |
| Operator scripts | `scripts/reconcile-erasure-journal.ts`, `scripts/encrypt-existing-user-data.ts`, `scripts/rotate-erasure-kek.ts`, `scripts/erasure-restore-drill.ts` |
| Erasure-store schema | `scripts/sql/erasure-store.sql` and migration `20260911114554_account_deletion_cryptographic_erasure` |

### Ciphertext format

```
enc1:<subjectId>:<keyVersion>:<base64url(nonce || tag || ciphertext)>
```

The AAD binds each value to `field|<Model>.<field>|<subjectId>`, so a ciphertext
cannot be moved between users or columns. Wrapped DEKs use AAD
`wrap|<kekId>|<subjectId>`.

`Project.formData` is stored as `{ "__enc": "enc1:..." }`. Rows written before
this feature are plain JSON; `openProjectFormData` accepts both, and
`npm run erasure:encrypt-existing:apply` seals the old rows.

### Institutional records

Protocols that were submitted (any status other than `DRAFT`), their status
history, review assignments with a COI declaration or evaluation report, SAE
reports, amendments, appeals, AAR applications, reports and the audit log are
committee records. They are kept, de-identified: the owner row becomes a
tombstone (`Deleted user`, `deleted-<id>@erased.invalid`) and the sealed form
data is re-encrypted from the user's key to the institutional subject key
(`institution-records`), which is never destroyed. The full table lives in
`RETENTION_POLICY` in `retention-policy.ts` and is the single place to change
what is retained.

## Deletion flow

```
REQUESTED -> ACCEPTED -> PROCESSING -> COMPLETED
                              \-> BLOCKED  (retried by the cron / reconcile)
```

1. **Authorisation at the boundary.** Self-service deletion requires a valid
   session created within the last 15 minutes and the typed word `DELETE`; it
   is rate limited (3 attempts per hour). Admin removal keeps the existing
   `requireAdmin` + `canManageRole` checks. The last active super administrator
   cannot be deleted.
2. **Journal first.** The intent is written to `erasure_journal` in the erasure
   store. If that write fails the request is refused and nothing else changes.
3. **Accept and lock.** In one transaction: create `account_deletion_request`
   (ACCEPTED), set `user.deletionRequestedAt`, ban the account
   (`ACCOUNT_DELETION_IN_PROGRESS`, which blocks sign-in), delete all sessions,
   write an audit-log entry. A notice is emailed to the address on file.
4. **Steps** (idempotent; progress is recorded in `completedSteps`):
   `revoke` (sessions, credential accounts, verification tokens) →
   `content` (posts/comments/topics/replies blanked and marked deleted;
   reactions and notifications deleted) →
   `files` (storage object deleted first, row second; failure blocks) →
   `protocols` (drafts deleted; retained protocols re-keyed; reviewer
   assignments without records deleted; the user unassigned) →
   `profile` (tombstone) →
   `key` (destroy, then read back to verify) →
   `verify` (sessions = 0, accounts = 0, tombstone present, key absent).
5. **Outcome.** COMPLETED writes counts to the journal and an
   `ACCOUNT_ERASURE_COMPLETED` audit entry. Any failure marks the request and
   journal BLOCKED with the error, reports to Sentry, and leaves everything in
   place for a retry. Nothing is ever reported as erased before it is verified.

## Restore gate

After any restore of the application database, before declaring the restore
finished:

```bash
npm run erasure:reconcile          # exit 2 while inconsistencies exist
npm run erasure:reconcile:apply    # re-apply deletions, then re-run the report
```

The daily cron (`/api/cron/erasure`, 01:00 UTC, protected by `CRON_SECRET`)
performs the same retry and reconciliation, so a missed manual step is caught
within a day. Reconciliation compares every journal entry with the database and
re-runs the deletion when the user row is not a tombstone, sessions or
credentials exist, or the key is present.

A restore can also bring back a retained protocol whose payload was sealed
under the deleted user's key before the deletion re-keyed it. That key is gone,
so the payload cannot be re-keyed again; reconciliation replaces it with an
`{ "__erased": true, "erasedAt": ... }` marker and the protocol page shows an
"erased" notice instead of the form. This is the expected outcome of
cryptographic erasure, not data loss: the committee record (status, history,
decisions, documents) survives, and the personal payload does not.

## Environment

| Variable | Purpose |
| --- | --- |
| `ERASURE_KEK` | Base64, 32 bytes. Wraps every DEK. Losing it makes all sealed data unreadable. |
| `ERASURE_KEK_ID` | Identifier of the current KEK (default `kek-1`). |
| `ERASURE_KEK_PREVIOUS` | Comma-separated `id:base64` pairs still accepted for unwrapping during rotation. |
| `ERASURE_STORE_URL` | PostgreSQL URL of the erasure store. Must be a separate database excluded from the application backup set. Apply `scripts/sql/erasure-store.sql`. |
| `ERASURE_HMAC_KEY` | Optional base64 key to pseudonymise email addresses in the journal. |

When `ERASURE_KEK` is absent the feature is **not configured**: deletion
requests are refused with "temporarily unavailable", the settings card says so,
and (outside production only) fields are stored in plaintext so local
development keeps working. In production, sealing without a key throws.

If `ERASURE_STORE_URL` is missing or points at the application database, the
feature works but `storeIsolated` is false: destroyed keys would come back with
a restore, and reconciliation is the only thing that removes them again. The UI
copy reflects this and does not claim isolated key storage.

## Deployment checklist

1. Create the erasure store database, exclude it from the application backup
   policy, apply `scripts/sql/erasure-store.sql`.
2. Generate `ERASURE_KEK` (`openssl rand -base64 32`) and `ERASURE_HMAC_KEY`;
   set `ERASURE_KEK_ID`, `ERASURE_STORE_URL`. Store the KEK only in the secret
   manager and back it up there; it is not in any database.
3. Deploy; run `npm run db:migrate` (adds `account_deletion_request`, the
   `user` columns, and mirror tables for single-database setups).
4. Backfill: `npm run erasure:encrypt-existing` (report), then
   `npm run erasure:encrypt-existing:apply`.
5. In staging, run the drill: `npm run erasure:drill`. It creates two synthetic
   users, takes a `pg_dump`, deletes one through the real service, restores the
   dump, asserts the restored data is unreadable, runs reconciliation and
   asserts the account is scrubbed again while the other user is untouched. The
   drill refuses to run unless the database name contains `drill`, `staging`,
   `test` or `dev`.
6. Add `npm run erasure:reconcile` to the restore runbook.
7. Rotate the KEK on the usual schedule with `npm run erasure:rotate-kek`.

## What this does not do

- Fields other than `Project.formData` and inline `File.data` are still stored
  in plaintext and are **scrubbed**, not encrypted. Their pre-deletion values
  therefore remain readable in old backups until those backups expire. Extend
  `fields.ts` and the retention table if more columns need to be sealed.
- Files in UploadThing are deleted through the provider API; we cannot verify
  the provider's own backups. Attachments to retained protocols are kept.
- Email notifications already sent (Resend), Sentry events and server logs are
  outside the database and follow their own retention.
- Retained committee records are de-identified, not destroyed. A protocol PDF
  uploaded by the user may itself contain their name; that is an institutional
  record by design.
- Cryptographic erasure is as strong as the secrecy of the KEK and the
  irrecoverability of the destroyed DEK. Keep the KEK out of the application
  database and its backups, and do not back up the erasure store into the same
  set as the application database.
