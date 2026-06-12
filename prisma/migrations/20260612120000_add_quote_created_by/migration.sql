-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Quote_createdById_idx" ON "Quote"("createdById");
