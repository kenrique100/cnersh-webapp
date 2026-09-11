# CNERSH Pre-Merge Runbook: Vercel + Neon

Use this guide with the follow-up branch `fix/erasure-revocation-and-deletion-safety`, based on PR #163's latest `ca15ea4` revision. Rehearse on disposable staging first; do not merge to `master`, run a production migration/backfill, or replace an existing production key as a test.

## What your screenshots need corrected

- **Same Neon branch:** Both connect dialogs show branch `production` and endpoint `ep-damp-shadow-am2nf7s2`, with databases `cnersh_staging` and `cnersh_erasure_staging`. Those are two databases on the same branch, not separate restore domains. A Neon branch restore overwrites all databases on that branch ([Neon branch restore](https://neon.com/docs/postgres/backup-restore/branch-restore)).
- **Branch label:** The name `production` does not itself establish whether this project serves your live app. Verify which project/endpoint your live Vercel Production variables use before running anything destructive.
- **Duplicate application variables:** The environment screenshot repeats `DATABASE_URL` and `DIRECT_URL`, first for the app and then for the erasure database. Remove the second pair. Both app variables must always name the app database; only `ERASURE_STORE_URL` names the key/journal database.
- **Connection strings:** Copy complete URLs from Neon, including role, password, hostname, database and TLS parameters. For the application, copy a pooled URL for runtime and a direct URL for migrations by toggling pooling in Connect; do not reconstruct a hostname manually ([Neon connection instructions](https://neon.com/docs/connect/connect-from-any-app)).
- **Placeholders:** `STAGING_KEK_BASE64` and `STAGING_HMAC_BASE64` are labels, not valid secrets. Generate staging and production independently; do not reuse one environment's keys in another.

Create a separate Neon project for the staging erasure store. For the first rehearsal, also use a fresh disposable staging app project containing synthetic data, not a clone of production. In each project, select the intended branch and use **Postgres database → Databases → Add database**, then copy the exact connection details ([Neon database management](https://neon.com/docs/manage/databases)).

Suggested layout:

| Environment | Application project/database | Separate erasure project/database |
| --- | --- | --- |
| Staging | `cnersh-staging-app` / `cnersh_staging` | `cnersh-staging-erasure` / `cnersh_erasure_staging` |
| Production | Your verified live application project/database | New production erasure project / `cnersh_erasure` |

Different endpoint strings are not proof of different Neon projects. Confirm separation in the console and review the erasure project's own history, branches, snapshots and exports; recoverable wrapped keys plus their KEK can decrypt old ciphertext ([Neon history window](https://neon.com/docs/introduction/restore-window)).

## Get the fixed code without disturbing your current checkout

Use a new worktree from your existing project. These commands do not merge anything:

```bash
git fetch origin fix/erasure-revocation-and-deletion-safety
git worktree add --detach ../cnersh-erasure-staging FETCH_HEAD
cd ../cnersh-erasure-staging
node --version
npm ci
```

Use Node.js 22.22.2 or newer and compatible PostgreSQL client tools (`psql`, `pg_dump`, `pg_restore`). Use the final reviewed follow-up revision for acceptance testing, not the older successful Vercel preview.

The follow-up preserves `47631d0` (skip erased markers/owners during backfill) and `ca15ea4` (one deletion request per user). It also resets an existing request during restore reconciliation instead of attempting an insertion that violates the new unique constraint. A forward migration enforces uniqueness on staging databases that ran the older migration; it deliberately fails on duplicates rather than deleting their history.

## Generate your production keys locally

Only for a first-time key setup, on your trusted operator machine:

```bash
npm run erasure:generate-keys -- --environment=production
git check-ignore .env.production.erasure.local
```

This creates an ignored `.env.production.erasure.local` with owner-only permissions on POSIX systems. It does not print values, overwrite an existing file, modify your normal `.env`, or deploy anything. Open it in your local editor and import the values into your secret manager and the matching Vercel environment; do not paste them into chat, a PR, or an issue.

| Variable | Generated value / meaning |
| --- | --- |
| `ERASURE_KEK` | Cryptographically random 32 bytes, encoded as base64; wraps data-encryption keys |
| `ERASURE_KEK_ID` | `prod-kek-1`; a stable non-secret label, not another random key |
| `ERASURE_HMAC_KEY` | Independently generated 32-byte base64 key for journal pseudonyms |
| `ERASURE_KEK_PREVIOUS` | Empty on first setup; omit in Vercel if the UI does not accept an empty value |
| `CRON_SECRET` | A third independently generated secret for the protected cron route |

The custom generated file is not loaded automatically by Next.js or the operator scripts. If you already have a configured production `CRON_SECRET` used by other jobs, retain that existing secret consistently rather than changing it unnecessarily.

Generate a separate staging set with:

```bash
npm run erasure:generate-keys -- --environment=staging
git check-ignore .env.staging.erasure.local
```

Do not regenerate the KEK on every deployment. If any data is already sealed, first recover the KEK and ID that sealed it from your existing secret manager; changing the KEK arbitrarily can make that data unreadable.

For a planned rotation, the syntax is `ERASURE_KEK_PREVIOUS="prod-kek-1:OLD_BASE64_KEK"` with a new current ID such as `prod-kek-2` and a new current KEK. Coordinate all deployments and operator processes, run `npm run erasure:rotate-kek`, and retain required old KEKs until live data and recoverable backups have been reviewed. This is not the first-time setup procedure.

## Prepare the staging operator environment

Create an ignored `.env` in the isolated worktree, using `.env.example` as the template. Replace each placeholder below with the copied URL or generated staging secret. Keep exactly one definition of each variable.

```dotenv
# Operator commands: same direct APP database URL for both.
DATABASE_URL="STAGING_APP_DIRECT_POSTGRES_URL"
DIRECT_URL="STAGING_APP_DIRECT_POSTGRES_URL"

# Different Neon project; never assign this URL to the two variables above.
ERASURE_STORE_URL="STAGING_ERASURE_DIRECT_POSTGRES_URL"

ERASURE_KEK="GENERATED_STAGING_KEK_BASE64"
ERASURE_KEK_ID="staging-kek-1"
ERASURE_HMAC_KEY="GENERATED_STAGING_HMAC_BASE64"
ERASURE_KEK_PREVIOUS=""
CRON_SECRET="STAGING_CRON_SECRET"
```

Configure staging-only authentication, Redis, UploadThing and email settings. Never attach production storage credentials to a disposable test environment. In a fresh Bash shell, load only this trusted local file:

```bash
chmod 600 .env
git check-ignore .env
set -a
source ./.env
set +a
```

Verify destinations without printing passwords or keys:

```bash
node <<'NODE'
for (const name of ["DATABASE_URL", "DIRECT_URL", "ERASURE_STORE_URL"]) {
  const u = new URL(process.env[name]);
  console.log(`${name}: host=${u.hostname}, database=${u.pathname.slice(1)}`);
}
if (process.env.DATABASE_URL !== process.env.DIRECT_URL)
  throw new Error("Use the same direct APP URL for operator commands");
if (new URL(process.env.DIRECT_URL).pathname !== "/cnersh_staging")
  throw new Error("Wrong staging app database");
if (new URL(process.env.ERASURE_STORE_URL).pathname !== "/cnersh_erasure_staging")
  throw new Error("Wrong staging erasure database");
for (const name of ["ERASURE_KEK", "ERASURE_HMAC_KEY"])
  if (Buffer.from(process.env[name] || "", "base64").length !== 32)
    throw new Error(`${name} must decode to 32 bytes`);
NODE
```

Compare those hosts with the separate projects in the Neon console. Database-name checks do not establish whether the destination is safe to destroy.

## Apply staging schemas and run the drill

The erasure SQL runs against the separate erasure store. Prisma migrations run against the app database:

```bash
psql "$ERASURE_STORE_URL" -X -v ON_ERROR_STOP=1 \
  -f scripts/sql/erasure-store.sql
npm run db:migrate
npx prisma migrate status
```

If an older staging installation has duplicate deletion requests, stop and review them. Do not delete pending requests or use `migrate resolve` to pretend a failed constraint migration succeeded. A disposable empty staging project may instead be recreated deliberately.

The following drill restores the entire app database and terminates its other connections. Run it only on a disposable, unused staging database, never production, never a shared preview containing work to keep, and never from the Vercel build command:

```bash
NODE_ENV=development npm run erasure:drill -- \
  --confirm-database=cnersh_staging
npm run erasure:reconcile
```

The npm alias supplies `--confirm-restore`; the new explicit database-name confirmation is also mandatory. Any unsuccessful `pg_restore` must fail the drill. Accept only a successful exit with expected fixture assertions, no shared-store warning, and a subsequent clean reconciliation report.

The drill tests a logical app-database restore. It does not prove permanent key destruction across Neon's own historical backups.

## Configure the Vercel preview and backfill

Open your Vercel project's **Settings → Environment Variables**. Scope staging values to **Preview** and the branch actually being tested, initially `fix/erasure-revocation-and-deletion-safety`; branch-specific values override general Preview settings, and changes apply only to new deployments ([Vercel environment variables](https://vercel.com/docs/environment-variables)).

| Variable | Preview value |
| --- | --- |
| `DATABASE_URL` | Pooled staging APP database URL |
| `DIRECT_URL` | Direct URL of that same staging APP database |
| `ERASURE_STORE_URL` | Separate staging erasure project's database URL |
| `ERASURE_KEK`, `ERASURE_KEK_ID`, `ERASURE_HMAC_KEY` | Exactly the staging values used by the operator scripts |
| `ERASURE_KEK_PREVIOUS` | Empty/omitted for first setup |
| `CRON_SECRET` | Staging secret |
| Existing auth/origin/Redis/upload/email variables | Staging/test values only |

Paste raw secret values into Vercel, not the surrounding dotenv quotes, and never use `NEXT_PUBLIC_` for secret variables. Redeploy after saving. Also configure the original feature branch's Preview scope when the follow-up is merged into it.

From the staging operator shell, include synthetic or properly sanitized pre-feature rows and run:

```bash
npm run erasure:encrypt-existing
npm run erasure:encrypt-existing:apply
npm run erasure:encrypt-existing
```

The first run reports eligible plaintext rows; the apply run seals them; the final report should show no remaining eligible rows. Test protocol/file reads afterwards; an empty database with zero eligible rows is not a meaningful backfill test.

Exercise verified completion, blocked deletion followed by recovery, remote-storage failure, a missing-user/key-store outage, two simultaneous super-admin requests, a banned replacement admin, and independent-instance key reads. Only `COMPLETED` should reach the completion page; a blocked request is accepted but not erased.

Vercel cron schedules run on production deployments, not Preview. Trigger staging retry/reconciliation explicitly or run the operator reconciliation command; do not wait for Preview's scheduled cron to fire ([Vercel cron quickstart](https://vercel.com/docs/cron-jobs/quickstart)).

## Merge and production release gates

The follow-up PR targets the still-open feature branch. Review and merge that follow-up into PR #163 first, then repeat staging acceptance on the final feature head. Do not merge PR #163 to `master` until the production release is approved.

The repository's CI/CD workflow deploys and migrates on a push to `master`. Review both that workflow and Vercel's independent Git auto-deployment settings before merging; a merge is not merely a code-review action in this project.

Before the production release:

1. Approve the remaining retention limitations below and save staging test evidence.
2. Create the independent production erasure store, apply its SQL, and verify its access and retention policy.
3. Save production keys in the secret manager and Vercel **Production**, using existing keys if data is already sealed.
4. Confirm operator `DATABASE_URL` and `DIRECT_URL` target the production app, while `ERASURE_STORE_URL` targets the separate production store.
5. During the approved maintenance window, pause writes/traffic; run migrations, deploy the compatible code, report/apply/re-report the backfill, and verify reads before reopening traffic.
6. Verify the production cron secret and monitoring. Do not run the destructive drill in production.
7. Keep a restore gate in the operational runbook:

```bash
# With the restored app offline and authoritative erasure store still intact:
npm run erasure:reconcile
npm run erasure:reconcile:apply
npm run erasure:reconcile
```

A read-only reconciliation exit code of `2` means inconsistencies remain. Any error, blocked request, or unreachable erasure store keeps the restored app offline. Restore only the application database, not the erasure store alongside it, and do not rely on tomorrow's cron to close today's restore gap.

## Limits that remain after the fixes

- **Plaintext backup data:** Only `Project.formData` and inline `File.data` are sealed. Other personal fields remain readable in older backups until those backups expire.
- **Key-store history:** Separate Neon projects prevent joint app-branch restoration, but do not prove that deleted wrapped keys are absent from all history, snapshots or exports ([Neon history window](https://neon.com/docs/introduction/restore-window)).
- **In-flight access:** Removing the DEK cache stops stale future reads. It cannot withdraw plaintext or key bytes already returned to an operation before destruction.
- **Retained identifying records:** Protocol forms, PDFs, attachments, reviews and audit records may identify a person. Do not describe these as anonymous.
- **Restored retained evidence:** A pre-transfer snapshot can contain a retained form encrypted under the now-deleted user key. Reconciliation marks that restored form erased; this is payload loss requiring retention-owner approval or an architectural change before release.
- **External systems:** UploadThing's own retention and already-sent email/logging systems remain outside this app-database erasure mechanism.

No production database, secret or storage resource needs to be touched for the pre-merge rehearsal above. Local tests and a successful preview build are evidence of code behavior, not evidence that production secrets, retention, or restore controls are configured.

## Local verification completed for this follow-up

The final local validation ran with Node.js 22.22.2 and isolated PostgreSQL 18.6 test databases. No production keys or databases were used.

| Check | Result |
| --- | --- |
| Full Jest suite | 119 suites, 1,924 tests passed |
| TypeScript | `npx tsc --noEmit` passed |
| ESLint | Zero errors; 23 existing warnings |
| Application build | `npm run build` passed |
| Fresh app migrations and erasure SQL | Passed, including the forward uniqueness migration |
| Real PostgreSQL acceptance checks | 16 checks passed, including simultaneous super-admin requests and restored unique-row reuse |
| Real PostgreSQL key races | Passed, including queued creation after destruction, durable revocation, and no stale cached reads |
| Retained-form stale-worker regression | Blocks without overwriting institutional ciphertext; retry succeeds |
| Full logical backup/restore drill | Passed on fresh local databases |
| Post-drill reconciliation | Zero inconsistencies after fixture cleanup |

The full drill's in-fixture assertions verified that deletion was reapplied and the unaffected user's data remained readable; the cleanup report alone is not that evidence. GitHub CI and Vercel preview results must be checked separately on the newly published PR head.
