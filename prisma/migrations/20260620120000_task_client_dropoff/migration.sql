-- AlterTable
ALTER TABLE "Task" ADD COLUMN "clientDropoffDate" TEXT;
ALTER TABLE "Task" ADD COLUMN "clientDropoffTime" TEXT;

-- Backfill existing scheduled tasks
UPDATE "Task"
SET
  "clientDropoffDate" = "dataAgendada",
  "clientDropoffTime" = "horario"
WHERE "dataAgendada" IS NOT NULL
  AND "horario" IS NOT NULL;
