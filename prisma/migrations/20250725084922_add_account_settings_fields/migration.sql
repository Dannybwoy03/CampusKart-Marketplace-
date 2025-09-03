-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dataSharing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showProfilePublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smsNotifications" BOOLEAN NOT NULL DEFAULT false;
