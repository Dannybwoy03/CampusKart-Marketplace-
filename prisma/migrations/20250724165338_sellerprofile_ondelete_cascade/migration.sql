-- DropForeignKey
ALTER TABLE "SellerProfile" DROP CONSTRAINT "SellerProfile_userId_fkey";

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
