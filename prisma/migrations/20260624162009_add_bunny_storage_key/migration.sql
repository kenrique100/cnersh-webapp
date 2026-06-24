/*
  Warnings:

  - A unique constraint covering the columns `[storageKey]` on the table `file` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "file" ADD COLUMN     "storageKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "file_storageKey_key" ON "file"("storageKey");
