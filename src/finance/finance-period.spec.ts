import { resolveFinancePeriod, prorateMonthlyCost, roundMoney } from './finance-period';

describe('finance-period', () => {
  it('defaults to current month preset', () => {
    const period = resolveFinancePeriod({ preset: 'month' });
    expect(period.periodStart).toMatch(/^\d{4}-\d{2}-01$/);
    expect(period.periodEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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
