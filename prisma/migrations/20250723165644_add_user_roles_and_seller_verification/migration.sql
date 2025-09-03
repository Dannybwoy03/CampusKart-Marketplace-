-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BUYER', 'SELLER', 'ADMIN', 'SUPERADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'BUYER',
ADD COLUMN     "sellerVerification" TEXT,
ADD COLUMN     "sellerVerified" BOOLEAN NOT NULL DEFAULT false;
