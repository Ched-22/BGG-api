-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('CREATED', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DEACTIVATED');

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "unitCostSnapshot" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_idx" ON "InventoryMovement"("productId");

-- CreateIndex
CREATE INDEX "InventoryMovement_occurredAt_idx" ON "InventoryMovement"("occurredAt");

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "InventoryProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill CREATED for existing products
INSERT INTO "InventoryMovement" (
    "id",
    "productId",
    "type",
    "quantityBefore",
    "quantityAfter",
    "quantityDelta",
    "unitCostSnapshot",
    "note",
    "actorId",
    "actorName",
    "occurredAt",
    "createdAt"
)
SELECT
    gen_random_uuid()::text,
    "id",
    'CREATED'::"InventoryMovementType",
    0,
    "currentQuantity",
    "currentQuantity",
    COALESCE("unitCost", 0),
    NULL,
    NULL,
    'Sistema',
    "createdAt",
    "createdAt"
FROM "InventoryProduct";
