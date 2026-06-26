-- CreateTable
CREATE TABLE "VehicleInspection" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "taskDisplayId" TEXT,
    "entryData" JSONB NOT NULL DEFAULT '{}',
    "exitData" JSONB NOT NULL DEFAULT '{}',
    "entryFinalizedAt" TIMESTAMP(3),
    "exitFinalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleInspection_appointmentId_key" ON "VehicleInspection"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleInspection_taskDisplayId_key" ON "VehicleInspection"("taskDisplayId");
