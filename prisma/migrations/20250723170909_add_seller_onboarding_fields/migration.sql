-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bankAccount" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sellerAgreementAccepted" BOOLEAN NOT NULL DEFAULT false;
