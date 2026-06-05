import { AppointmentStatus } from '@prisma/client';

/** v1 heuristic until a dedicated feedback model exists. */
export function computeRating(completedCount: number): number {
  return Number(Math.min(5, 4.6 + completedCount * 0.005).toFixed(2));
}

export function computeUtilizationPercent(workloadHours: number): number {
  return Math.round((workloadHours / 8) * 100);
}

export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.IN_PROGRESS,
];
