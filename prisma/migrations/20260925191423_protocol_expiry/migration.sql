-- AlterEnum
ALTER TYPE "project_status" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- AlterTable
ALTER TABLE "project" ADD COLUMN "expiresAt"      TIMESTAMP(3);
ALTER TABLE "project" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
CREATE INDEX "project_expiresAt_idx"        ON "project"("expiresAt");
CREATE INDEX "project_status_expiresAt_idx" ON "project"("status", "expiresAt");
