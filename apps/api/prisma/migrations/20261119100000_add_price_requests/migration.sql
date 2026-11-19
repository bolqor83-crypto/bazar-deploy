-- Цена по запросу (Промт 16, Часть C — ADR 0016).
--
-- Реконсиляция: в прод-БД была применена миграция прошлой сессии
-- (20261118220140_add_price_requests) с прототипной схемой
-- (sellerId, quotedPrice, answeredAt, declineReason, CANCELLED) —
-- файл миграции не попал в репозиторий, данные не создавались
-- (все таблицы пусты). Эта миграция приводит схему к финальному
-- дизайну: сначала снимает прототип (IF EXISTS — идемпотентно),
-- затем создаёт финальные структуры.
--
-- Финальный дизайн:
--   1. ProductOffer.priceOnRequest — флаг скрытия базовой цены
--      (цена остаётся обязательной >0, но не покидает сервер
--      в публичных ответах каталога);
--   2. PriceRequest — запрос цены покупателем и персональное
--      предложение продавца (действует 72 часа; истечение
--      вычисляемое — ANSWERED && validUntil < now, без cron);
--   3. CartItem.priceRequestId — позиция корзины по персональной
--      цене; OrderItem.priceRequestId — трассировка в заказе
--      (без FK: заказ живёт дольше запроса, колонка — снимок).

-- ── Часть 1: снять прототип прошлой сессии (no-op на чистой БД) ──

ALTER TABLE "CartItem" DROP COLUMN IF EXISTS "priceRequestId";
ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "priceRequestId";
DROP TABLE IF EXISTS "PriceRequest";
DROP TYPE IF EXISTS "PriceRequestStatus";

-- ── Часть 2: финальная схема ──

-- AlterTable
ALTER TABLE "ProductOffer" ADD COLUMN IF NOT EXISTS "priceOnRequest" BOOLEAN NOT NULL DEFAULT false;

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

-- AddForeignKey
ALTER TABLE "PriceRequest" ADD CONSTRAINT "PriceRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRequest" ADD CONSTRAINT "PriceRequest_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ProductOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN "priceRequestId" TEXT;

-- CreateIndex
CREATE INDEX "CartItem_priceRequestId_idx" ON "CartItem"("priceRequestId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_priceRequestId_fkey" FOREIGN KEY ("priceRequestId") REFERENCES "PriceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "priceRequestId" TEXT;

-- CreateIndex
CREATE INDEX "OrderItem_priceRequestId_idx" ON "OrderItem"("priceRequestId");
