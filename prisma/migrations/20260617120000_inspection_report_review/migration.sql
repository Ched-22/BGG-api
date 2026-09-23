-- CreateEnum
CREATE TYPE "InspectionReportStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'SENT_TO_CLIENT');

-- AlterTable
ALTER TABLE "VehicleInspection" ADD COLUMN     "reportStatus" "InspectionReportStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "submittedForReviewAt" TIMESTAMP(3),
ADD COLUMN     "sentToClientAt" TIMESTAMP(3);
