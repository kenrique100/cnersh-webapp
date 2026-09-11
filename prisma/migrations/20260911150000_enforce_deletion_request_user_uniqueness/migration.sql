-- ca15ea4 added uniqueness to the original, still-unmerged feature migration.
-- Also enforce it forward-only for staging databases that applied be8dc49.
-- Deliberately fail if duplicate requests exist; operators must review their
-- progress/journal before consolidating rows, rather than dropping evidence.
CREATE UNIQUE INDEX IF NOT EXISTS "account_deletion_request_userId_key"
ON "account_deletion_request"("userId");

DROP INDEX IF EXISTS "account_deletion_request_userId_idx";
