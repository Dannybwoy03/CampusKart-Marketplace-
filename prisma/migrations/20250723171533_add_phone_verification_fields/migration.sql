-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneVerificationCode" TEXT,
ADD COLUMN     "phoneVerificationExpiry" TIMESTAMP(3);
