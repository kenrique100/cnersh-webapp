# Database Migration and Deployment

The canonical release procedure is maintained in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). This file provides the database-specific details needed for existing installations.

## Migration history

| Migration | Purpose |
|---|---|
| `20260623034320_init_full` | Initial application schema |
| `20260624162009_add_bunny_storage_key` | File storage-key support |
| `20260801221000_remove_trending_add_feed_indexes` | Feed index and schema update |
| `20260909223000_unique_committee_session_schedule` | Retry-safe committee-session uniqueness |

## New database

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

## Existing database created with `prisma db push`

Do not mark migrations as applied until you confirm their schema is already present.

1. Back up the database.
2. Compare the live schema with `prisma/schema.prisma`.
3. Baseline only migrations already represented in the live schema:

```bash
npx prisma migrate resolve --applied 20260623034320_init_full
npx prisma migrate resolve --applied 20260624162009_add_bunny_storage_key
npx prisma migrate resolve --applied 20260801221000_remove_trending_add_feed_indexes
```

4. Check for duplicate committee sessions:

```sql
SELECT "sessionType", "sessionDate", COUNT(*)
FROM "committee_session"
GROUP BY "sessionType", "sessionDate"
HAVING COUNT(*) > 1;
```

5. Resolve every duplicate deliberately. The repository ships a preflight that plans this for you:

```bash
npm run db:dedupe:sessions          # read-only report, writes backups/committee-session-duplicates-*.json
npm run db:dedupe:sessions:apply    # merges only the groups with no conflicting data
```

The report classifies each duplicate group as auto-resolvable or needing review. Apply mode backs up every row it deletes to `backups/`, runs inside one transaction, re-reads each group before writing, and refuses any group whose duplicates disagree on status, venue, minutes, notes, or quorum. Resolve those flagged groups by hand using the queries the report prints, then re-run the report until it is clean.

6. Once no duplicates remain, run:

```bash
npx prisma migrate deploy
npx prisma migrate status
```

Never use `prisma db push --accept-data-loss` or `prisma migrate reset` against production.
