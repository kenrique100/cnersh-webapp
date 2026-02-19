-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'REVIEW_ASSIGNED';

-- AlterTable
ALTER TABLE "project" ADD COLUMN "assignedToId" TEXT;

-- CreateIndex
CREATE INDEX "project_assignedToId_idx" ON "project"("assignedToId");

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
