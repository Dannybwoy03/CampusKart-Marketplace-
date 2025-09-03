-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "orderNote" TEXT;

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "saveForLater" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderNote" TEXT;

-- CreateTable
CREATE TABLE "CartAddress" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartAddress_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartAddress" ADD CONSTRAINT "CartAddress_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
