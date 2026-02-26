-- AlterTable: Add trackingCode column with a temporary default
ALTER TABLE "project" ADD COLUMN "trackingCode" TEXT;

-- Backfill existing rows with a unique tracking code derived from their ID
UPDATE "project"
SET "trackingCode" = 'CNERSH-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 4)) || '-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 5, 4)) || '-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 9, 4))
WHERE "trackingCode" IS NULL;

-- Make the column NOT NULL after backfill
ALTER TABLE "project" ALTER COLUMN "trackingCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "project_trackingCode_key" ON "project"("trackingCode");

-- CreateIndex
CREATE INDEX "project_trackingCode_idx" ON "project"("trackingCode");
