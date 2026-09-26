-- CreateTable
CREATE TABLE "community_topic_read_status" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_topic_read_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_topic_read_status_userId_idx" ON "community_topic_read_status"("userId");

-- CreateIndex
CREATE INDEX "community_topic_read_status_topicId_idx" ON "community_topic_read_status"("topicId");

-- CreateIndex
CREATE INDEX "community_topic_read_status_topicId_lastReadAt_idx" ON "community_topic_read_status"("topicId", "lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "community_topic_read_status_userId_topicId_key" ON "community_topic_read_status"("userId", "topicId");

-- AddForeignKey
ALTER TABLE "community_topic_read_status" ADD CONSTRAINT "community_topic_read_status_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_topic_read_status" ADD CONSTRAINT "community_topic_read_status_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "community_topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
