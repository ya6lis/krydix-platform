-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('MARKETPLACE', 'SUPPORT');

-- CreateEnum
CREATE TYPE "SupportChatStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "type" "ChatType" NOT NULL DEFAULT 'MARKETPLACE',
ADD COLUMN     "subject" TEXT,
ADD COLUMN     "status" "SupportChatStatus",
ADD COLUMN     "requesterId" TEXT,
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill updatedAt for existing rows
UPDATE "Chat" SET "updatedAt" = "createdAt";

-- CreateIndex
CREATE INDEX "Chat_type_status_idx" ON "Chat"("type", "status");

-- CreateIndex
CREATE INDEX "Chat_requesterId_idx" ON "Chat"("requesterId");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
