-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "activityLog" JSONB NOT NULL DEFAULT '[]';
