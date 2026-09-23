import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';

const ZONE = 'Europe/Lisbon';

export const FINANCE_PRESETS = ['month', 'quarter', 'semester', 'year'] as const;
export type FinancePreset = (typeof FINANCE_PRESETS)[number];

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

  const bounds = resolvePresetBounds(now, preset);
  return toPeriod(bounds.start, bounds.end);
}

function resolvePresetBounds(now: DateTime, preset: string): { start: DateTime; end: DateTime } {
  if (preset === 'month') {
    return { start: now.startOf('month'), end: now.endOf('month') };
  }

  if (preset === 'quarter') {
    const quarterStartMonth = Math.floor((now.month - 1) / 3) * 3 + 1;
    const start = now.set({ month: quarterStartMonth, day: 1 }).startOf('day');
    const end = start.plus({ months: 3 }).minus({ days: 1 }).endOf('day');
    return { start, end };
  }

  if (preset === 'semester') {
    const yearStart = now.startOf('year');
    if (now.month <= 6) {
      return {
        start: yearStart,
        end: yearStart.plus({ months: 5 }).endOf('month'),
      };
    }
    return {
      start: yearStart.plus({ months: 6 }).startOf('month'),
      end: now.endOf('year'),
    };
  }

  if (preset === 'year') {
    return { start: now.startOf('year'), end: now.endOf('year') };
  }

  throw new BadRequestException(`preset inválido (use ${FINANCE_PRESETS.join(', ')})`);
}

function toPeriod(start: DateTime, end: DateTime): FinancePeriod {
  const zoneStart = start.startOf('day');
  const zoneEnd = end.endOf('day');
  return {
    periodStart: zoneStart.toISODate()!,
    periodEnd: zoneEnd.toISODate()!,
    windowStart: zoneStart.toUTC().toJSDate(),
    windowEnd: zoneEnd.toUTC().toJSDate(),
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
