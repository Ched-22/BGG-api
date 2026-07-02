import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  const period = {
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    windowStart: new Date('2026-06-01T00:00:00.000Z'),
    windowEnd: new Date('2026-06-30T23:59:59.999Z'),
  };

  const prisma = {
    task: { findMany: jest.fn() },
    inventoryConsumption: { aggregate: jest.fn() },
    financeExpense: { aggregate: jest.fn(), groupBy: jest.fn() },
    user: { findMany: jest.fn() },
  };

  const financeRevenueService = {
    aggregateRevenueForSummary: jest.fn(),
  };

  let service: FinanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinanceService(prisma as never, financeRevenueService as never);
    financeRevenueService.aggregateRevenueForSummary.mockResolvedValue({
      totalRevenue: 800,
      pendingRevenue: 200,
      completedServicesCount: 2,
    });
    prisma.inventoryConsumption.aggregate.mockResolvedValue({
      _sum: { totalCost: 45 },
    });
    prisma.financeExpense.aggregate.mockResolvedValue({
      _sum: { amount: 200 },
    });
    prisma.financeExpense.groupBy.mockResolvedValue([
      { category: 'fixed', _sum: { amount: 200 } },
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'tech-1',
        role: 'TECHNICIAN',
        active: true,
        employeeCost: { monthlyCost: 1000, effectiveFrom: new Date('2026-01-01') },
      },
    ]);
  });

  it('computes summary KPIs', async () => {
    const result = await service.getSummary({ preset: 'month' });
    expect(result.preset).toBe('month');
    expect(result.totalRevenue).toBe(800);
    expect(result.pendingRevenue).toBe(200);
    expect(result.completedServicesCount).toBe(2);
    expect(result.averageRevenue).toBe(400);
    expect(result.productCosts).toBe(45);
    expect(result.accountExpenses).toBe(200);
    expect(result.grossProfit).toBe(755);
    expect(result.currency).toBe('EUR');
    expect(result.breakdown.fixed).toBe(200);
  });

  it('scales employee costs by preset period', async () => {
    const month = await service.getSummary({ preset: 'month' });
    const quarter = await service.getSummary({ preset: 'quarter' });
    const semester = await service.getSummary({ preset: 'semester' });
    const year = await service.getSummary({ preset: 'year' });

    expect(month.periodStart).not.toBe(quarter.periodStart);
    expect(quarter.periodStart).not.toBe(semester.periodStart);
    expect(month.employeeCosts).toBeGreaterThan(0);
    expect(quarter.employeeCosts).toBeGreaterThan(month.employeeCosts);
    expect(semester.employeeCosts).toBeGreaterThan(quarter.employeeCosts);
    expect(year.employeeCosts).toBeGreaterThan(semester.employeeCosts);
  });

  it('accepts custom date range', async () => {
    const result = await service.getSummary({
      periodStart: '2026-03-01',
      periodEnd: '2026-05-31',
    });
    expect(result.preset).toBe('custom');
    expect(result.periodStart).toBe('2026-03-01');
    expect(result.periodEnd).toBe('2026-05-31');
    expect(result.employeeCosts).toBe(3000);
  });

  it('rejects partial custom date range', async () => {
    await expect(
      service.getSummary({ periodStart: '2026-03-01' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects non-technician employee cost', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      id: 'admin-1',
      name: 'Admin',
      role: 'ADMIN',
      active: true,
    });

    await expect(
      service.upsertEmployeeCost('admin-1', { monthlyCost: 500 }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
