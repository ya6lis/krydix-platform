-- CreateEnum
CREATE TYPE "PayoutSchedule" AS ENUM ('WEEKLY_TUESDAY', 'BIWEEKLY', 'MONTHLY_FIRST', 'ON_DEMAND');

-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN "description" TEXT;

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "percent" DECIMAL(5,2) NOT NULL,
    "fixedFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "payoutSchedule" "PayoutSchedule" NOT NULL DEFAULT 'WEEKLY_TUESDAY',
    "payoutHoldDays" INTEGER NOT NULL DEFAULT 3,
    "payoutMinimum" DECIMAL(10,2) NOT NULL DEFAULT 25,
    "payoutCurrency" TEXT NOT NULL DEFAULT 'USD',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRule_categoryId_key" ON "CommissionRule"("categoryId");

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default platform config
INSERT INTO "PlatformConfig" ("id", "payoutSchedule", "payoutHoldDays", "payoutMinimum", "payoutCurrency", "updatedAt")
VALUES ('default', 'WEEKLY_TUESDAY', 3, 25, 'USD', CURRENT_TIMESTAMP);
