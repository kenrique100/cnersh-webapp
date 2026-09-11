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
deletion in a journal in the erasure store, and remove the user's wrapped DEK
from the live key store. Ciphertext protected solely by that DEK is unreadable
only if no recoverable copy of the DEK remains, including in key-store history,
exports, or memory already held by an in-flight operation. After a restore, a
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
committee records. They are kept: the owner row becomes a
tombstone (`Deleted user`, `deleted-<id>@erased.invalid`) and the sealed form
data is re-encrypted from the user's key to the institutional subject key
(`institution-records`), which is never destroyed. The full table lives in
`RETENTION_POLICY` in `retention-policy.ts` and is the single place to change
what is retained. This is not an anonymity guarantee: form payloads, documents,
review records, and audit details may still identify the person.

### Revocation and concurrency

There is no process-local DEK cache. Reads consult the store each time; a read
that starts after committed key destruction cannot use a stale cached key.
This cannot revoke plaintext or key bytes already returned to an in-flight
operation.

Key creation, acceptance-journal insertion, and key destruction share a
per-subject PostgreSQL transaction advisory lock in the erasure store.
Creation checks for any durable journal entry while holding that lock.
Acceptance therefore prevents new key acquisition for writes, and destruction
leaves a permanent journal tombstone even if no key existed. Never delete
real subjects' journal entries. Read-only access to an existing key remains
available until destruction so retained records can be re-keyed.

An application transaction advisory lock serializes deletion acceptance,
including the last-super-admin check. Available replacements must be
non-banned, non-erased, not deletion-requested, and have no unfinished request
or durable deletion journal entry. The journal is committed before the first
application mutation; an intent left behind by an application rollback still
excludes that subject from the replacement-admin count.

Retained-form re-keying uses a compare-and-set update against the originally
read payload. A stale worker blocks and retries rather than overwriting newer
institutional ciphertext with an erased marker.

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
5. **Outcome.** Only verified COMPLETED outcomes navigate to the confirmation
   page. Accepted/blocked outcomes remain visibly incomplete. The profile
   `erasedAt` marker never overrides an existing unfinished request.
   COMPLETED writes counts to the journal before completing the app row, and an
   `ACCOUNT_ERASURE_COMPLETED` audit entry. Any failure marks the request and
   journal BLOCKED with the error, reports to Sentry, and leaves everything in
   place for a retry. Missing-user paths also require verified key destruction;
   store outages do not count as success.

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
credentials exist, the key is present, or an application request is unfinished.
Reconciliation reuses the unique per-user request row, resets stale checkpoints
when a restored user is live again, and does not advance `lastReconciledAt`
on a blocked outcome. If the journal store is unavailable, keep the restored
application offline rather than reopening access and waiting for cron.

A restore can also bring back a retained protocol whose payload was sealed
under the deleted user's key before the deletion re-keyed it. That key is gone,
so the payload cannot be re-keyed again; reconciliation replaces it with an
`{ "__erased": true, "erasedAt": ... }` marker and the protocol page shows an
"erased" notice instead of the form. This loses the restored form payload,
including any required evidence within it. Other committee records may survive,
but this must be explicitly approved by the retention owner before production;
otherwise institutional custody/backup design must change before release.

## Environment

| Variable | Purpose |
| --- | --- |
| `ERASURE_KEK` | Base64, 32 bytes. Wraps every DEK. Losing it makes all sealed data unreadable. |
| `ERASURE_KEK_ID` | Identifier of the current KEK (default `kek-1`). |
| `ERASURE_KEK_PREVIOUS` | Comma-separated `id:base64` pairs still accepted for unwrapping during rotation. |
| `ERASURE_STORE_URL` | PostgreSQL URL of the erasure store. Must be a separate database excluded from the application backup set. Apply `scripts/sql/erasure-store.sql`. |
| `ERASURE_HMAC_KEY` | Optional base64 key to pseudonymise email addresses in the journal. |
| `CRON_SECRET` | Independent secret protecting the erasure cron endpoint. |

When `ERASURE_KEK` is absent the feature is **not configured**: deletion
requests are refused with "temporarily unavailable", the settings card says so,
and (outside production only) fields are stored in plaintext so local
development keeps working. In production, sealing without a key throws.

If `ERASURE_STORE_URL` is missing or points at the application database, the
feature works but `storeIsolated` is false: destroyed keys would come back with
a restore, and reconciliation is the only thing that removes them again. The UI
copy reflects this and does not claim isolated key storage.

The URL-based isolation flag is only a heuristic. Different database names
on the same Neon endpoint are not treated as isolated: Neon branch restore
overwrites every database on that branch, and a separate endpoint is still not
proof of independent retention ([Neon branch restore](https://neon.com/docs/postgres/backup-restore/branch-restore)).
Use a separate Neon project and review its own historical key copies; history
windows permit recovery and are not an immediate cryptographic-destruction
guarantee ([Neon history window](https://neon.com/docs/introduction/restore-window)).

### Generate secrets once, locally

After installing dependencies, run on your trusted operator machine:

```bash
npm run erasure:generate-keys -- --environment=production
# Separately, for a different staging key set:
npm run erasure:generate-keys -- --environment=staging
```

The script writes `.env.production.erasure.local` or
`.env.staging.erasure.local`, uses mode `0600` on POSIX systems, prints no key
values, and refuses to overwrite an existing file. These filenames are ignored
by Git. Import values into your secret manager and the matching host environment;
neither Next.js nor the operator scripts automatically loads these custom files.
Do not regenerate secrets for redeployments or substitute new values if data is
already sealed. On first setup, `ERASURE_KEK_PREVIOUS` is empty and
`ERASURE_KEK_ID` is `prod-kek-1` or `staging-kek-1`.

Rotation is different: preserve the old `id:base64` KEK in
`ERASURE_KEK_PREVIOUS`, assign a new unique current ID and KEK, coordinate all
readers/writers, then run `npm run erasure:rotate-kek`. Keep old wrapping keys
until all required live and recoverable records have been accounted for.
Do not rotate the HMAC key casually; it changes pseudonymous identifiers.

## Deployment checklist

Use [the Vercel + Neon runbook](./ERASURE_DEPLOYMENT_VERCEL_NEON.md) for the
staging-first sequence, screenshot corrections, and production release gates.

1. Create the erasure store database, exclude it from the application backup
   policy, apply `scripts/sql/erasure-store.sql`.
2. Generate `ERASURE_KEK` and `ERASURE_HMAC_KEY` using the local command above;
   set `ERASURE_KEK_ID`, `ERASURE_STORE_URL`. Store the KEK only in the secret
   manager and back it up there; it is not in any database.
3. In an approved release window, keep traffic paused and run `npm run db:migrate` (adds `account_deletion_request`, the
   `user` columns, and mirror tables for single-database setups).
4. Backfill: `npm run erasure:encrypt-existing` (report), then
   `npm run erasure:encrypt-existing:apply`.
5. Before production, in disposable staging, run the drill with the explicit
   database confirmation documented in the Vercel + Neon runbook. It creates two synthetic
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
- Deleting a row from the erasure store does not prove deletion of that key
  from the store's own snapshots/history/exports. A recoverable wrapped DEK plus
  its KEK can still decrypt the corresponding ciphertext. Separate projects
  prevent joint app restores, not every form of key recovery.
