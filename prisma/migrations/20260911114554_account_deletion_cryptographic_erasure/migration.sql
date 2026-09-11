-- CreateEnum
CREATE TYPE "account_deletion_status" AS ENUM ('REQUESTED', 'ACCEPTED', 'PROCESSING', 'BLOCKED', 'COMPLETED');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "erasedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "account_deletion_request" (
    "id" TEXT NOT NULL,
    "status" "account_deletion_status" NOT NULL DEFAULT 'REQUESTED',
    "requestedVia" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "completedSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "journalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "account_deletion_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "erasure_subject_key" (
    "subjectId" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "kekId" TEXT NOT NULL,
    "wrappedDek" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),

    CONSTRAINT "erasure_subject_key_pkey" PRIMARY KEY ("subjectId")
);

-- CreateTable
CREATE TABLE "erasure_journal" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "emailHmac" TEXT,
    "status" TEXT NOT NULL,
    "requestedVia" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keyDestroyedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastReconciledAt" TIMESTAMP(3),
    "details" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "erasure_journal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_deletion_request_userId_key" ON "account_deletion_request"("userId");

-- CreateIndex
CREATE INDEX "account_deletion_request_status_idx" ON "account_deletion_request"("status");

-- CreateIndex
CREATE INDEX "account_deletion_request_createdAt_idx" ON "account_deletion_request"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "erasure_journal_subjectId_key" ON "erasure_journal"("subjectId");

-- CreateIndex
CREATE INDEX "erasure_journal_status_idx" ON "erasure_journal"("status");

-- CreateIndex
CREATE INDEX "erasure_journal_emailHmac_idx" ON "erasure_journal"("emailHmac");

-- CreateIndex
CREATE INDEX "user_erasedAt_idx" ON "user"("erasedAt");

-- AddForeignKey
ALTER TABLE "account_deletion_request" ADD CONSTRAINT "account_deletion_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
