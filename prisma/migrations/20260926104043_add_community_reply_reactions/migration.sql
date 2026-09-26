-- CreateTable
CREATE TABLE "community_reply_reaction" (
    "id" TEXT NOT NULL,
    "replyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_reply_reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_reply_reaction_replyId_idx" ON "community_reply_reaction"("replyId");

-- CreateIndex
CREATE INDEX "community_reply_reaction_userId_idx" ON "community_reply_reaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "community_reply_reaction_replyId_userId_emoji_key" ON "community_reply_reaction"("replyId", "userId", "emoji");

-- AddForeignKey
ALTER TABLE "community_reply_reaction" ADD CONSTRAINT "community_reply_reaction_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "community_reply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reply_reaction" ADD CONSTRAINT "community_reply_reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
