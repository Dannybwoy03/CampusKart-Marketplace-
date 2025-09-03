-- Add missing columns to Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stock" INTEGER NOT NULL DEFAULT 1;

-- Add missing columns to Notification table
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT 'Notification';
