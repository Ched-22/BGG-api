import { DateTime, Settings } from 'luxon';
import { resolveFinancePeriod, prorateMonthlyCost, roundMoney } from './finance-period';

describe('finance-period', () => {
  beforeEach(() => {
    Settings.now = () => Date.UTC(2026, 5, 15, 12, 0, 0);
  });

  afterEach(() => {
    Settings.now = () => Date.now();
  });

  it('defaults to current month preset', () => {
    const period = resolveFinancePeriod({ preset: 'month' });
    expect(period.periodStart).toBe('2026-06-01');
    expect(period.periodEnd).toBe('2026-06-30');
  });

  it('resolves current quarter preset', () => {
    const period = resolveFinancePeriod({ preset: 'quarter' });
    expect(period.periodStart).toBe('2026-04-01');
    expect(period.periodEnd).toBe('2026-06-30');
    expect(period.windowStart.getTime()).toBeLessThan(period.windowEnd.getTime());
  });

  it('resolves current semester preset in first half', () => {
    const period = resolveFinancePeriod({ preset: 'semester' });
    expect(period.periodStart).toBe('2026-01-01');
    expect(period.periodEnd).toBe('2026-06-30');
  });

  it('resolves current year preset', () => {
    const period = resolveFinancePeriod({ preset: 'year' });
    expect(period.periodStart).toBe('2026-01-01');
    expect(period.periodEnd).toBe('2026-12-31');
  });

  it('resolves current semester preset in second half', () => {
    Settings.now = () => Date.UTC(2026, 8, 10, 12, 0, 0);
    const period = resolveFinancePeriod({ preset: 'semester' });
    expect(period.periodStart).toBe('2026-07-01');
    expect(period.periodEnd).toBe('2026-12-31');
  });

  it('prorates monthly cost across a quarter', () => {
    const period = resolveFinancePeriod({ preset: 'quarter' });
    const total = prorateMonthlyCost(3000, period, new Date('2026-01-01'));
    expect(roundMoney(total)).toBe(9000);
  });

  it('prorates monthly cost for full month', () => {
    const period = resolveFinancePeriod({
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
    });
    const total = prorateMonthlyCost(3000, period, new Date('2026-01-01'));
    expect(roundMoney(total)).toBe(3000);
  });
});
