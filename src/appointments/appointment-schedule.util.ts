import { ConflictException } from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';

export async function findTechnicianIdsWithScheduleConflict(
  prisma: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ userId: string }[]>`
    SELECT a."userId" as "userId"
    FROM "Appointment" a
    WHERE a.status::text NOT IN ('CANCELLED')
    GROUP BY a."userId", a."scheduledAt"
    HAVING COUNT(*) > 1
  `;
  return [...new Set(rows.map((r) => r.userId))];
}

export async function assertNoScheduleConflict(
  prisma: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  userId: string,
  scheduledAt: Date,
  excludeAppointmentId?: string,
): Promise<void> {
  const existing = await prisma.appointment.findFirst({
    where: {
      userId,
      scheduledAt,
      status: { not: AppointmentStatus.CANCELLED },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
  });

  if (existing) {
    throw new ConflictException('Horário já reservado para este técnico');
  }
}
