-- DropTable (legacy unused Service model)
DROP TABLE IF EXISTS "Service";

-- CreateTable
CREATE TABLE "CatalogService" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogServicePrice" (
    "id" TEXT NOT NULL,
    "catalogServiceId" TEXT NOT NULL,
    "priceSmall" DOUBLE PRECISION NOT NULL,
    "priceMedium" DOUBLE PRECISION NOT NULL,
    "priceLarge" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogServicePrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicianService" (
    "userId" TEXT NOT NULL,
    "catalogServiceId" TEXT NOT NULL,

    CONSTRAINT "TechnicianService_pkey" PRIMARY KEY ("userId","catalogServiceId")
);

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "serviceSnapshots" JSONB;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "serviceCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "CatalogService_code_key" ON "CatalogService"("code");

-- CreateIndex
CREATE INDEX "CatalogServicePrice_catalogServiceId_effectiveFrom_idx" ON "CatalogServicePrice"("catalogServiceId", "effectiveFrom" DESC);

-- AddForeignKey
ALTER TABLE "CatalogServicePrice" ADD CONSTRAINT "CatalogServicePrice_catalogServiceId_fkey" FOREIGN KEY ("catalogServiceId") REFERENCES "CatalogService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianService" ADD CONSTRAINT "TechnicianService_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianService" ADD CONSTRAINT "TechnicianService_catalogServiceId_fkey" FOREIGN KEY ("catalogServiceId") REFERENCES "CatalogService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
