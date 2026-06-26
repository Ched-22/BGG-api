-- CreateEnum
CREATE TYPE "ClientPreferredLanguage" AS ENUM ('es', 'ca', 'en', 'ptBr', 'ptPt');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "preferredLanguage" "ClientPreferredLanguage" NOT NULL DEFAULT 'es';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "clientPreferredLanguage" "ClientPreferredLanguage" NOT NULL DEFAULT 'es';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "clientePreferredLanguage" "ClientPreferredLanguage" NOT NULL DEFAULT 'es';
