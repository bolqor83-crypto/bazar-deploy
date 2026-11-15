-- CreateTable
CREATE TABLE "DeliveryRequest" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "carrierOrganizationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pickupAddress" TEXT NOT NULL,
    "pickupContact" TEXT NOT NULL,
    "dropoffAddress" TEXT NOT NULL,
    "dropoffContact" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "volumeL" DOUBLE PRECISION,
    "cargoNotes" TEXT,
    "price" INTEGER,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryEvent" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT,
    "payload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryCounter" (
    "year" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DeliveryCounter_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRequest_number_key" ON "DeliveryRequest"("number");

-- CreateIndex
CREATE INDEX "DeliveryRequest_orderId_idx" ON "DeliveryRequest"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryRequest_carrierOrganizationId_idx" ON "DeliveryRequest"("carrierOrganizationId");

-- CreateIndex
CREATE INDEX "DeliveryRequest_status_idx" ON "DeliveryRequest"("status");

-- CreateIndex
CREATE INDEX "DeliveryEvent_deliveryId_idx" ON "DeliveryEvent"("deliveryId");

-- AddForeignKey
ALTER TABLE "DeliveryRequest" ADD CONSTRAINT "DeliveryRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRequest" ADD CONSTRAINT "DeliveryRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRequest" ADD CONSTRAINT "DeliveryRequest_carrierOrganizationId_fkey" FOREIGN KEY ("carrierOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "DeliveryRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
