/*
  Warnings:

  - The `method` column on the `PaymentRecord` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'CASH_ON_DELIVERY', 'BANK_TRANSFER');

-- AlterTable
ALTER TABLE "PaymentRecord" DROP COLUMN "method",
ADD COLUMN     "method" "PaymentMethod";

-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN     "minOrderAmount" DECIMAL(10,2);
