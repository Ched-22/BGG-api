-- CreateTable
CREATE TABLE "TaskPayment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "settlementStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "iban" TEXT,
    "amount" DOUBLE PRECISION,
    "isInstallment" BOOLEAN NOT NULL DEFAULT false,
    "installmentCount" INTEGER,
    "installmentsPaid" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskPayment_taskId_key" ON "TaskPayment"("taskId");

-- CreateIndex
CREATE INDEX "TaskPayment_settlementStatus_idx" ON "TaskPayment"("settlementStatus");

-- AddForeignKey
ALTER TABLE "TaskPayment" ADD CONSTRAINT "TaskPayment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill pending payments for eligible tasks
INSERT INTO "TaskPayment" (
    "id",
    "taskId",
    "settlementStatus",
    "isInstallment",
    "installmentsPaid",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    t."id",
    'pending',
    false,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Task" t
WHERE t."status" IN ('Pronto para QA', 'Concluído')
  AND NOT EXISTS (
    SELECT 1 FROM "TaskPayment" tp WHERE tp."taskId" = t."id"
  );
