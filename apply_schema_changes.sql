-- PostgreSQL migration for Supabase - Enhanced Payment System
-- Run this in your Supabase SQL editor to add the new fields and tables

-- Add new columns to Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT DEFAULT 'pending';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "autoReleaseDate" TIMESTAMP;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION DEFAULT 0.05;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "commissionAmount" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sellerAmount" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundReason" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "transferReference" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "transferredAt" TIMESTAMP;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;

-- Create Commission table
CREATE TABLE IF NOT EXISTS "Commission" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Commission_orderId_key" UNIQUE ("orderId")
);

-- Create Refund table
CREATE TABLE IF NOT EXISTS "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    
    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Refund_orderId_key" UNIQUE ("orderId")
);

-- Add foreign key constraints (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Commission_orderId_fkey'
    ) THEN
        ALTER TABLE "Commission" ADD CONSTRAINT "Commission_orderId_fkey" 
            FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Refund_orderId_fkey'
    ) THEN
        ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" 
            FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Update existing orders to have commission calculations
UPDATE "Order" SET 
    "commissionRate" = 0.05,
    "commissionAmount" = "amount" * 0.05,
    "sellerAmount" = "amount" * 0.95
WHERE "commissionAmount" IS NULL;
