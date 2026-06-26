-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('EXTERIOR', 'INTERIOR', 'COMPLETE', 'MOTO');

-- AlterTable
ALTER TABLE "CatalogService" ADD COLUMN "service_category" "ServiceCategory";

UPDATE "CatalogService" SET "service_category" = 'EXTERIOR' WHERE "code" IN ('polim', 'motor', 'rodas', 'farol');
UPDATE "CatalogService" SET "service_category" = 'INTERIOR' WHERE "code" IN ('couro', 'ozonio', 'higie');
UPDATE "CatalogService" SET "service_category" = 'COMPLETE' WHERE "code" IN ('vitri', 'ppf', 'ceram');
UPDATE "CatalogService" SET "service_category" = 'MOTO' WHERE "code" IN ('motos');

-- Dev / manual services created in Admin without a dedicated mapping
UPDATE "CatalogService" SET "service_category" = 'EXTERIOR' WHERE "code" IN ('test', 'testluk', 'tests2');

-- Fallback for any other legacy row (local dev); edit via Admin after deploy
UPDATE "CatalogService" SET "service_category" = 'EXTERIOR' WHERE "service_category" IS NULL;

ALTER TABLE "CatalogService" ALTER COLUMN "service_category" SET NOT NULL;
