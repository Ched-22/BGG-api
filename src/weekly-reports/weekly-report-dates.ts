import { DateTime } from 'luxon';

const ZONE = 'Europe/Lisbon';

export type WeekWindow = {
  weekStart: string;
  weekEnd: string;
  windowStart: Date;
  windowEnd: Date;
};

export function resolveWeekWindow(weekStartParam?: string, reference = DateTime.now().setZone(ZONE)): WeekWindow {
  if (weekStartParam) {
    const start = DateTime.fromISO(weekStartParam, { zone: ZONE }).startOf('day');
    if (!start.isValid) {
      throw new Error('Invalid weekStart date');
    }
    const end = start.plus({ days: 6 }).endOf('day');
    return toWindow(start, end);
  }

  const thisWeekMonday = reference.startOf('week');
  const start = thisWeekMonday.minus({ weeks: 1 });
  const end = start.plus({ days: 6 }).endOf('day');
  return toWindow(start, end);
}

function toWindow(start: DateTime, end: DateTime): WeekWindow {
  return {
    weekStart: start.toISODate()!,
    weekEnd: end.toISODate()!,
    windowStart: start.toUTC().toJSDate(),
    windowEnd: end.toUTC().toJSDate(),
  };
}

export function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const start = DateTime.fromISO(weekStart, { zone: ZONE });
  const end = DateTime.fromISO(weekEnd, { zone: ZONE });
  return `${start.toFormat('dd/MM')} – ${end.toFormat('dd/MM/yyyy')}`;
}

export function formatGeneratedAt(date = DateTime.now().setZone(ZONE)): string {
  return date.toFormat("dd/MM/yyyy 'às' HH:mm");
}

export function formatEur(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}
