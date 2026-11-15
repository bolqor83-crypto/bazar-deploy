-- Склад event-sourced (Промт 11, ADR 0012).
--
-- Три сущности:
--   StockLocation — склады организации (default создаётся всем);
--   StockMovement — append-only журнал движений (источник правды);
--   StockBalance  — денормализованный остаток (physical/reserved/available).
--
-- Перенос данных (до drop column):
--   1. Default-склад «Основной склад» — каждой организации;
--   2. ProductOffer.stock → StockBalance(INITIAL): physical =
--      stock + активные резервы, reserved = резервы активных заказов,
--      available = stock (колонка stock хранила доступный остаток —
--      резерв уже был вычтен при создании заказа);
--   3. INITIAL-движение на каждый непустой остаток;
--   4. RESERVED-движения на резервы активных заказов (PENDING/
--      CONFIRMED) — чтобы подтверждение/отмена работали как обычно.
--
-- Журнал StockChange (Промт 10, previous/new) удаляется: его данные
-- уже свёрнуты в переносимый остаток, новая история ведётся в
-- StockMovement. Snapshot снят до миграции (см. отчёт Промта 11a).

-- CreateEnum
CREATE TYPE "StockLocationType" AS ENUM ('WAREHOUSE', 'STORE', 'OTHER');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('INITIAL', 'RECEIPT', 'SALE_OUT', 'RETURN_IN', 'WRITE_OFF', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'RESERVED', 'UNRESERVED');

-- CreateTable
CREATE TABLE "StockLocation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StockLocationType" NOT NULL,
    "address" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBalance" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "physicalQty" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "availableQty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockLocation_organizationId_idx" ON "StockLocation"("organizationId");

-- CreateIndex
CREATE INDEX "StockMovement_offerId_locationId_createdAt_idx" ON "StockMovement"("offerId", "locationId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_refType_refId_idx" ON "StockMovement"("refType", "refId");

-- CreateIndex
CREATE INDEX "StockBalance_offerId_idx" ON "StockBalance"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "StockBalance_offerId_locationId_key" ON "StockBalance"("offerId", "locationId");

-- AddForeignKey
ALTER TABLE "StockLocation" ADD CONSTRAINT "StockLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ProductOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ProductOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Перенос данных (внутри транзакции миграции Prisma).
-- 1. Default-склад каждой организации (даже без офферов — единообразие
--    с onboarding, где склад создаётся при регистрации).
INSERT INTO "StockLocation" ("id", "organizationId", "name", "type", "address", "isDefault", "createdAt")
SELECT gen_random_uuid()::text, o."id", 'Основной склад', 'WAREHOUSE', NULL, TRUE, now()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "StockLocation" sl WHERE sl."organizationId" = o."id"
);

-- 2. Балансы: ProductOffer.stock → StockBalance. Колонка stock
--    хранила доступный остаток (резервы активных заказов уже вычтены),
--    поэтому physical восстанавливаем: stock + резервы.
INSERT INTO "StockBalance" ("id", "offerId", "locationId", "physicalQty", "reservedQty", "availableQty", "updatedAt")
SELECT
  gen_random_uuid()::text,
  po."id",
  sl."id",
  po."stock" + COALESCE(r."reserved", 0),
  COALESCE(r."reserved", 0),
  po."stock",
  now()
FROM "ProductOffer" po
JOIN "StockLocation" sl
  ON sl."organizationId" = po."organizationId" AND sl."isDefault" = TRUE
LEFT JOIN (
  SELECT oi."offerId" AS "offerId", SUM(oi."quantity") AS "reserved"
  FROM "OrderItem" oi
  JOIN "Order" o ON o."id" = oi."orderId"
  WHERE o."status" IN ('PENDING', 'CONFIRMED')
  GROUP BY oi."offerId"
) r ON r."offerId" = po."id"
WHERE po."stock" > 0 OR COALESCE(r."reserved", 0) > 0;

-- 3. INITIAL-движение на каждый перенесённый остаток.
INSERT INTO "StockMovement" ("id", "offerId", "locationId", "type", "quantityDelta", "reason", "actorId", "refType", "refId", "createdAt")
SELECT
  gen_random_uuid()::text,
  po."id",
  sl."id",
  'INITIAL',
  po."stock" + COALESCE(r."reserved", 0),
  'Начальный остаток (миграция)',
  NULL,
  'initial',
  po."id",
  now()
FROM "ProductOffer" po
JOIN "StockLocation" sl
  ON sl."organizationId" = po."organizationId" AND sl."isDefault" = TRUE
LEFT JOIN (
  SELECT oi."offerId" AS "offerId", SUM(oi."quantity") AS "reserved"
  FROM "OrderItem" oi
  JOIN "Order" o ON o."id" = oi."orderId"
  WHERE o."status" IN ('PENDING', 'CONFIRMED')
  GROUP BY oi."offerId"
) r ON r."offerId" = po."id"
WHERE po."stock" + COALESCE(r."reserved", 0) > 0;

-- 4. RESERVED-движения на резервы активных заказов: подтверждение
--    (SALE_OUT + UNRESERVED) и отмена (PENDING → UNRESERVED,
--    CONFIRMED → RETURN_IN) найдут свои резервы по refType/refId.
INSERT INTO "StockMovement" ("id", "offerId", "locationId", "type", "quantityDelta", "reason", "actorId", "refType", "refId", "createdAt")
SELECT
  gen_random_uuid()::text,
  oi."offerId",
  sl."id",
  'RESERVED',
  -oi."quantity",
  'Резерв заказа ' || o."number",
  o."buyerId",
  'order',
  o."id",
  now()
FROM "OrderItem" oi
JOIN "Order" o ON o."id" = oi."orderId"
JOIN "ProductOffer" po ON po."id" = oi."offerId"
JOIN "StockLocation" sl
  ON sl."organizationId" = po."organizationId" AND sl."isDefault" = TRUE
WHERE o."status" IN ('PENDING', 'CONFIRMED');

-- DropForeignKey
ALTER TABLE "StockChange" DROP CONSTRAINT "StockChange_offerId_fkey";

-- AlterTable
ALTER TABLE "ProductOffer" DROP COLUMN "stock";

-- DropTable
DROP TABLE "StockChange";
