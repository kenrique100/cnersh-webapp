-- AlterTable
ALTER TABLE "like" ADD COLUMN "reactionType" TEXT NOT NULL DEFAULT 'Like';

-- AlterTable
ALTER TABLE "comment_like" ADD COLUMN "reactionType" TEXT NOT NULL DEFAULT 'Like';
