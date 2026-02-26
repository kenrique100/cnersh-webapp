-- AlterTable: Add trackingCode column with a temporary default
ALTER TABLE "project" ADD COLUMN "trackingCode" TEXT;

-- Backfill existing rows with a unique tracking code including the year from createdAt
UPDATE "project"
SET "trackingCode" = 'CNERSH-' || EXTRACT(YEAR FROM COALESCE("createdAt", NOW()))::TEXT || '-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
WHERE "trackingCode" IS NULL;

-- Make the column NOT NULL after backfill
ALTER TABLE "project" ALTER COLUMN "trackingCode" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "project_trackingCode_key" ON "project"("trackingCode");

-- CreateIndex
CREATE INDEX "project_trackingCode_idx" ON "project"("trackingCode");
