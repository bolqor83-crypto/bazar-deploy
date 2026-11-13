-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "subtitle" TEXT;

-- AlterTable
ALTER TABLE "ProductOffer" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OfferPriceHistory" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "priceKopecks" INTEGER NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockChange" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfferPriceHistory_offerId_idx" ON "OfferPriceHistory"("offerId");

-- CreateIndex
CREATE INDEX "StockChange_offerId_idx" ON "StockChange"("offerId");

-- CreateIndex
CREATE INDEX "Product_organizationId_idx" ON "Product"("organizationId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferPriceHistory" ADD CONSTRAINT "OfferPriceHistory_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ProductOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockChange" ADD CONSTRAINT "StockChange_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ProductOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
