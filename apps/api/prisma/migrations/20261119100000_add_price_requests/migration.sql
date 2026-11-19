-- Цена по запросу (Промт 16, Часть C — ADR 0016).
--
-- Три изменения:
--   1. ProductOffer.priceOnRequest — флаг скрытия базовой цены
--      (цена остаётся обязательной >0, но не покидает сервер
--      в публичных ответах каталога);
--   2. PriceRequest — запрос цены покупателем и персональное
--      предложение продавца (действует 72 часа; истечение
--      вычисляемое — ANSWERED && validUntil < now, без cron);
--   3. CartItem.priceRequestId — позиция корзины по персональной
--      цене; OrderItem.priceRequestId — трассировка в заказе
--      (без FK: заказ живёт дольше запроса, колонка — снимок).

-- AlterTable
ALTER TABLE "ProductOffer" ADD COLUMN "priceOnRequest" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "PriceRequestStatus" AS ENUM ('PENDING', 'ANSWERED', 'DECLINED');

-- CreateTable
CREATE TABLE "PriceRequest" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "message" TEXT,
    "status" "PriceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "quotedPriceKopecks" INTEGER,
    "validUntil" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceRequest_buyerId_createdAt_idx" ON "PriceRequest"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "PriceRequest_offerId_idx" ON "PriceRequest"("offerId");

-- CreateIndex
CREATE INDEX "PriceRequest_status_idx" ON "PriceRequest"("status");

-- CreateIndex
CREATE INDEX "CartItem_priceRequestId_idx" ON "CartItem"("priceRequestId");

-- CreateIndex
CREATE INDEX "OrderItem_priceRequestId_idx" ON "OrderItem"("priceRequestId");

-- AddForeignKey
ALTER TABLE "PriceRequest" ADD CONSTRAINT "PriceRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRequest" ADD CONSTRAINT "PriceRequest_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ProductOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN "priceRequestId" TEXT;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_priceRequestId_fkey" FOREIGN KEY ("priceRequestId") REFERENCES "PriceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "priceRequestId" TEXT;
