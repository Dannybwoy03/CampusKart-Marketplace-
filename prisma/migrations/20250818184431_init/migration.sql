/*
  Warnings:

  - You are about to drop the column `cartId` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `saveForLater` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `ModerationReport` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedAt` on the `ModerationReport` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedById` on the `ModerationReport` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `ModerationReport` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `ModerationReport` table. All the data in the column will be lost.
  - You are about to drop the column `commissionAmount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `orderNote` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `payoutAmount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `condition` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `priceDiff` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `SellerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `bankAccount` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `bankName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `dataSharing` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emailNotifications` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phoneVerificationCode` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phoneVerificationExpiry` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phoneVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `sellerAgreementAccepted` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `sellerVerification` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `sellerVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `showProfilePublic` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `smsNotifications` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorSecret` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Cart` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CartAddress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Commission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ManualPayment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductPriceHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RefundRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Request` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Wishlist` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `CartItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `CartItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `ModerationReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ModerationReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingAddress` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_userId_fkey";

-- DropForeignKey
ALTER TABLE "CartAddress" DROP CONSTRAINT "CartAddress_cartId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- DropForeignKey
ALTER TABLE "Commission" DROP CONSTRAINT "Commission_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_user1Id_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_user2Id_fkey";

-- DropForeignKey
ALTER TABLE "ManualPayment" DROP CONSTRAINT "ManualPayment_orderId_fkey";

-- DropForeignKey
ALTER TABLE "ManualPayment" DROP CONSTRAINT "ManualPayment_userId_fkey";

-- DropForeignKey
ALTER TABLE "ManualPayment" DROP CONSTRAINT "ManualPayment_verifiedById_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "ModerationReport" DROP CONSTRAINT "ModerationReport_reporterId_fkey";

-- DropForeignKey
ALTER TABLE "ModerationReport" DROP CONSTRAINT "ModerationReport_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "ProductPriceHistory" DROP CONSTRAINT "ProductPriceHistory_productId_fkey";

-- DropForeignKey
ALTER TABLE "RefundRequest" DROP CONSTRAINT "RefundRequest_orderId_fkey";

-- DropForeignKey
ALTER TABLE "RefundRequest" DROP CONSTRAINT "RefundRequest_processedById_fkey";

-- DropForeignKey
ALTER TABLE "RefundRequest" DROP CONSTRAINT "RefundRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "Request" DROP CONSTRAINT "Request_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "Request" DROP CONSTRAINT "Request_productId_fkey";

-- DropForeignKey
ALTER TABLE "Request" DROP CONSTRAINT "Request_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";

-- DropForeignKey
ALTER TABLE "Wishlist" DROP CONSTRAINT "Wishlist_productId_fkey";

-- DropForeignKey
ALTER TABLE "Wishlist" DROP CONSTRAINT "Wishlist_userId_fkey";

-- DropIndex
DROP INDEX "Conversation_user1Id_user2Id_key";

-- AlterTable
ALTER TABLE "CartItem" DROP COLUMN "cartId",
DROP COLUMN "saveForLater",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ModerationReport" DROP COLUMN "note",
DROP COLUMN "reviewedAt",
DROP COLUMN "reviewedById",
DROP COLUMN "targetId",
DROP COLUMN "type",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "productId" TEXT NOT NULL,
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "commissionAmount",
DROP COLUMN "orderNote",
DROP COLUMN "payoutAmount",
DROP COLUMN "total",
ADD COLUMN     "orderNotes" TEXT,
ADD COLUMN     "paymentMethod" TEXT NOT NULL,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "shippingAddress" TEXT NOT NULL,
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "createdAt",
ADD COLUMN     "variantId" TEXT,
ALTER COLUMN "quantity" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "imageUrl",
ADD COLUMN     "reports" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requests" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "altText" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "color",
DROP COLUMN "condition",
DROP COLUMN "priceDiff",
DROP COLUMN "size",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "priceModifier" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "value" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "text",
ADD COLUMN     "comment" TEXT;

-- AlterTable
ALTER TABLE "SellerProfile" DROP COLUMN "email",
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verificationDocuments" TEXT[],
ALTER COLUMN "storeName" DROP NOT NULL,
ALTER COLUMN "contact" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "bankAccount",
DROP COLUMN "bankName",
DROP COLUMN "dataSharing",
DROP COLUMN "emailNotifications",
DROP COLUMN "phone",
DROP COLUMN "phoneVerificationCode",
DROP COLUMN "phoneVerificationExpiry",
DROP COLUMN "phoneVerified",
DROP COLUMN "sellerAgreementAccepted",
DROP COLUMN "sellerVerification",
DROP COLUMN "sellerVerified",
DROP COLUMN "showProfilePublic",
DROP COLUMN "smsNotifications",
DROP COLUMN "twoFactorEnabled",
DROP COLUMN "twoFactorSecret",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "university" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'BUYER';

-- DropTable
DROP TABLE "Cart";

-- DropTable
DROP TABLE "CartAddress";

-- DropTable
DROP TABLE "Commission";

-- DropTable
DROP TABLE "ManualPayment";

-- DropTable
DROP TABLE "ProductPriceHistory";

-- DropTable
DROP TABLE "RefundRequest";

-- DropTable
DROP TABLE "Request";

-- DropTable
DROP TABLE "Wishlist";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
