-- Add missing fields to ProductReview
ALTER TABLE "ProductReview" ADD COLUMN "sellerReply" TEXT;
ALTER TABLE "ProductReview" ADD COLUMN "photos" JSONB;
