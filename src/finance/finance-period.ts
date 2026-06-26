import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';

const ZONE = 'Europe/Lisbon';

export type FinancePeriod = {
  periodStart: string;
  periodEnd: string;
  windowStart: Date;
  windowEnd: Date;
};

type ResolveOptions = {
  preset?: string;
  periodStart?: string;
  periodEnd?: string;
};

export function resolveFinancePeriod(options: ResolveOptions = {}): FinancePeriod {
  const now = DateTime.now().setZone(ZONE);
  const preset = options.preset?.trim() || 'month';

  if (options.periodStart && options.periodEnd) {
    const start = DateTime.fromISO(options.periodStart, { zone: ZONE }).startOf('day');
    const end = DateTime.fromISO(options.periodEnd, { zone: ZONE }).endOf('day');
    if (!start.isValid || !end.isValid || end < start) {
      throw new BadRequestException('Intervalo de datas inválido');
    }
    return toPeriod(start, end);
  }

  let start: DateTime;
  let end: DateTime;

  if (preset === 'quarter') {
    start = now.startOf('quarter');
    end = now.endOf('quarter');
  } else if (preset === 'year') {
    start = now.startOf('year');
    end = now.endOf('year');
  } else if (preset === 'month') {
    start = now.startOf('month');
    end = now.endOf('month');
  } else {
    throw new BadRequestException('preset inválido (use month, quarter ou year)');
  }

  return toPeriod(start, end);
}

function toPeriod(start: DateTime, end: DateTime): FinancePeriod {
  return {
    periodStart: start.toISODate()!,
    periodEnd: end.toISODate()!,
    windowStart: start.toUTC().toJSDate(),
    windowEnd: end.toUTC().toJSDate(),
  };
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function prorateMonthlyCost(
  monthlyCost: number,
  period: FinancePeriod,
  effectiveFrom: Date,
): number {
  const zoneStart = DateTime.fromISO(period.periodStart, { zone: ZONE }).startOf('day');
  const zoneEnd = DateTime.fromISO(period.periodEnd, { zone: ZONE }).endOf('day');
  const effective = DateTime.fromJSDate(effectiveFrom, { zone: ZONE }).startOf('day');

  let total = 0;
  let cursor = zoneStart.startOf('month');

  while (cursor <= zoneEnd) {
    const monthStart = DateTime.max(cursor, zoneStart, effective).startOf('day');
    const monthEnd = DateTime.min(cursor.endOf('month'), zoneEnd).startOf('day');
    if (monthEnd < monthStart) {
      cursor = cursor.plus({ months: 1 }).startOf('month');
      continue;
    }
    const daysInMonth = cursor.daysInMonth!;
    const daysInPeriod = monthEnd.diff(monthStart, 'days').days + 1;
    total += monthlyCost * (daysInPeriod / daysInMonth);
    cursor = cursor.plus({ months: 1 }).startOf('month');
  }

  return roundMoney(total);
}
