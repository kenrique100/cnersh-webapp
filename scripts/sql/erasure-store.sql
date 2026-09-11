-- Erasure store schema.
--
-- Apply this to the database referenced by ERASURE_STORE_URL when that store
-- is separate from the application database (recommended). The same tables
-- are also created in the application database by the Prisma migration
-- 20260911114554_account_deletion_cryptographic_erasure so that a single-
-- database deployment works out of the box; in that mode key destruction is
-- still real, but the key store shares the application database's backups.
--
-- Columns are quoted camelCase to match the Prisma model names.

CREATE TABLE IF NOT EXISTS "erasure_subject_key" (
    "subjectId"  TEXT PRIMARY KEY,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "kekId"      TEXT NOT NULL,
    "wrappedDek" BYTEA NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt"  TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "erasure_journal" (
    "id"               TEXT PRIMARY KEY,
    "subjectId"        TEXT NOT NULL UNIQUE,
    "emailHmac"        TEXT,
    "status"           TEXT NOT NULL,
    "requestedVia"     TEXT NOT NULL,
    "requestedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keyDestroyedAt"   TIMESTAMP(3),
    "completedAt"      TIMESTAMP(3),
    "lastReconciledAt" TIMESTAMP(3),
    "details"          JSONB,
    "updatedAt"        TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "erasure_journal_status_idx"    ON "erasure_journal" ("status");
CREATE INDEX IF NOT EXISTS "erasure_journal_emailHmac_idx" ON "erasure_journal" ("emailHmac");
