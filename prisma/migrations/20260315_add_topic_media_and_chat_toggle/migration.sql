-- AlterTable
ALTER TABLE "community_topic" ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "community_topic" ADD COLUMN "videos" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "community_topic" ADD COLUMN "documents" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "community_topic" ADD COLUMN "chatEnabled" BOOLEAN NOT NULL DEFAULT true;
