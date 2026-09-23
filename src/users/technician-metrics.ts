import { AppointmentStatus } from '@prisma/client';

/** v1 heuristic until a dedicated feedback model exists. */
export function computeRating(completedCount: number): number {
  return Number(Math.min(5, 4.6 + completedCount * 0.005).toFixed(2));
}

export const DEFAULT_SCHEDULED_SLOT_HOURS = 1.5;

export const ACTIVE_TASK_STATUSES = ['Agendado', 'Em andamento'];

export function computeUtilizationPercent(
  scheduledHours: number,
  capacityHours: number,
): number {
  if (capacityHours <= 0 || scheduledHours <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((scheduledHours / capacityHours) * 100));
}

export function getTodayBounds(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export function getTodayDateString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
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

export function sumScheduledHours(
  taskDurations: Array<number | null | undefined>,
  appointmentCount: number,
  defaultSlotHours = DEFAULT_SCHEDULED_SLOT_HOURS,
): number {
  const taskHours = taskDurations.reduce<number>(
    (sum, hours) => sum + (hours ?? defaultSlotHours),
    0,
  );
  const appointmentHours = appointmentCount * defaultSlotHours;
  return taskHours + appointmentHours;
}
