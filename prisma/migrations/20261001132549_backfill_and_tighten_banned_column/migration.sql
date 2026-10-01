-- Backfill any NULL values to false BEFORE making the column NOT NULL.
UPDATE "user" SET "banned" = false WHERE "banned" IS NULL;

-- Add a default for future inserts.
ALTER TABLE "user" ALTER COLUMN "banned" SET DEFAULT false;

-- Tighten the column now that no NULLs remain.
ALTER TABLE "user" ALTER COLUMN "banned" SET NOT NULL;