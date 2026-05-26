-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'CATEGORY_CHANGE';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "icon" TEXT;
