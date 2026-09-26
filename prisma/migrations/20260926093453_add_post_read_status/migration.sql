-- CreateTable
CREATE TABLE "post_read_status" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_read_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_read_status_userId_idx" ON "post_read_status"("userId");

-- CreateIndex
CREATE INDEX "post_read_status_postId_idx" ON "post_read_status"("postId");

-- CreateIndex
CREATE INDEX "post_read_status_userId_readAt_idx" ON "post_read_status"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "post_read_status_userId_postId_key" ON "post_read_status"("userId", "postId");

-- AddForeignKey
ALTER TABLE "post_read_status" ADD CONSTRAINT "post_read_status_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_read_status" ADD CONSTRAINT "post_read_status_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
