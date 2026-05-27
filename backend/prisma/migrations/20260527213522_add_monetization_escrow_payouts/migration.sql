-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('ON_HOLD', 'ELIGIBLE_FOR_RELEASE', 'RELEASED', 'WITHDRAWN', 'BLOCKED', 'REFUNDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_CAPTURED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYOUT_RELEASED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYOUT_WITHDRAWN';
ALTER TYPE "AuditAction" ADD VALUE 'PAYOUT_BLOCKED';
ALTER TYPE "AuditAction" ADD VALUE 'REFUND_ISSUED';
ALTER TYPE "AuditAction" ADD VALUE 'PLATFORM_CONFIG_CHANGE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'IN_ESCROW';
ALTER TYPE "PaymentStatus" ADD VALUE 'CHARGEBACK';
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELED';

-- AlterTable
ALTER TABLE "Chat" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DeliveryRecord" ADD COLUMN     "confirmedReceivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "currencySnapshot" TEXT NOT NULL DEFAULT 'UAH';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "buyerFeeAmountSnapshot" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "buyerFeePercentSnapshot" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "confirmedReceivedAt" TIMESTAMP(3),
ADD COLUMN     "currencySnapshot" TEXT NOT NULL DEFAULT 'UAH',
ADD COLUMN     "payoutHoldUntil" TIMESTAMP(3),
ADD COLUMN     "platformFeeAmountSnapshot" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "platformFeePercentSnapshot" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sellerFeeAmountSnapshot" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sellerFeePercentSnapshot" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sellerPayoutAmountSnapshot" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PaymentRecord" ADD COLUMN     "escrowAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PlatformConfig" ADD COLUMN     "autoConfirmDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "buyerPaysReturnShipping" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defaultBuyerFeePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "defaultPlatformFeePercent" DECIMAL(5,2) NOT NULL DEFAULT 2,
ADD COLUMN     "defaultWithdrawalFeePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "disputeResolutionDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "refundProcessingDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "returnRequiresApproval" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "returnWindowDays" INTEGER NOT NULL DEFAULT 14,
ALTER COLUMN "payoutCurrency" SET DEFAULT 'UAH';

-- CreateTable
CREATE TABLE "SellerPayout" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amountGross" DECIMAL(10,2) NOT NULL,
    "platformFeeAmount" DECIMAL(10,2) NOT NULL,
    "withdrawalFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountNet" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UAH',
    "status" "PayoutStatus" NOT NULL DEFAULT 'ON_HOLD',
    "availableAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerPayout_orderItemId_key" ON "SellerPayout"("orderItemId");

-- CreateIndex
CREATE INDEX "SellerPayout_sellerId_idx" ON "SellerPayout"("sellerId");

-- CreateIndex
CREATE INDEX "SellerPayout_orderId_idx" ON "SellerPayout"("orderId");

-- CreateIndex
CREATE INDEX "SellerPayout_status_idx" ON "SellerPayout"("status");

-- AddForeignKey
ALTER TABLE "SellerPayout" ADD CONSTRAINT "SellerPayout_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPayout" ADD CONSTRAINT "SellerPayout_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPayout" ADD CONSTRAINT "SellerPayout_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
