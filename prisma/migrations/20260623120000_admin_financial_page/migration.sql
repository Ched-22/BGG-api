-- AlterTable
ALTER TABLE "InventoryProduct" ADD COLUMN "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "InventoryConsumption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityConsumed" INTEGER NOT NULL,
    "unitCostSnapshot" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceExpense" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthlyCost" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryConsumption_consumedAt_idx" ON "InventoryConsumption"("consumedAt");

-- CreateIndex
CREATE INDEX "InventoryConsumption_productId_idx" ON "InventoryConsumption"("productId");

-- CreateIndex
CREATE INDEX "FinanceExpense_occurredAt_idx" ON "FinanceExpense"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeCost_userId_key" ON "EmployeeCost"("userId");

-- AddForeignKey
ALTER TABLE "InventoryConsumption" ADD CONSTRAINT "InventoryConsumption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "InventoryProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCost" ADD CONSTRAINT "EmployeeCost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
