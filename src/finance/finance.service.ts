import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFinanceExpenseDto, UpdateFinanceExpenseDto } from './dto/finance-expense.dto';
import { UpsertEmployeeCostDto } from './dto/employee-cost.dto';
import { FinanceSummaryQueryDto } from './dto/finance-summary-query.dto';
import { FinanceRevenueService } from '../task-payment/finance-revenue.service';
import {
  FINANCE_PRESETS,
  FinancePeriod,
  prorateMonthlyCost,
  resolveFinancePeriod,
  roundMoney,
} from './finance-period';

const EXPENSE_CATEGORIES = ['fixed', 'variable', 'tax', 'other'] as const;

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private financeRevenueService: FinanceRevenueService,
  ) {}

  async getSummary(dto: FinanceSummaryQueryDto) {
    const customStart = dto.periodStart?.trim();
    const customEnd = dto.periodEnd?.trim();

    if (customStart || customEnd) {
      if (!customStart || !customEnd) {
        throw new BadRequestException('Informe data de início e fim do período');
      }
      const period = resolveFinancePeriod({
        periodStart: customStart,
        periodEnd: customEnd,
      });
      return this.buildSummaryResponse('custom', period);
    }

    const requestedPreset = dto.preset?.trim() || 'month';
    if (!FINANCE_PRESETS.includes(requestedPreset as (typeof FINANCE_PRESETS)[number])) {
      throw new BadRequestException(
        `preset inválido (use ${FINANCE_PRESETS.join(', ')})`,
      );
    }

    const period = resolveFinancePeriod({ preset: requestedPreset });
    return this.buildSummaryResponse(requestedPreset, period);
  }

  private async buildSummaryResponse(
    preset: string,
    period: FinancePeriod,
  ) {
    const [
      revenueAgg,
      productCostAgg,
      expenseAgg,
      expensesByCategory,
      employeeCosts,
    ] = await Promise.all([
      this.financeRevenueService.aggregateRevenueForSummary(period),
      this.prisma.inventoryConsumption.aggregate({
        where: {
          consumedAt: { gte: period.windowStart, lte: period.windowEnd },
        },
        _sum: { totalCost: true },
      }),
      this.prisma.financeExpense.aggregate({
        where: {
          active: true,
          occurredAt: { gte: period.windowStart, lte: period.windowEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.financeExpense.groupBy({
        by: ['category'],
        where: {
          active: true,
          occurredAt: { gte: period.windowStart, lte: period.windowEnd },
        },
        _sum: { amount: true },
      }),
      this.computeEmployeeCosts(period),
    ]);

    const totalRevenue = roundMoney(revenueAgg.totalRevenue);
    const pendingRevenue = roundMoney(revenueAgg.pendingRevenue);
    const completedServicesCount = revenueAgg.completedServicesCount;
    const averageRevenue =
      completedServicesCount > 0
        ? roundMoney(totalRevenue / completedServicesCount)
        : 0;
    const productCosts = roundMoney(productCostAgg._sum.totalCost ?? 0);
    const accountExpenses = roundMoney(expenseAgg._sum.amount ?? 0);
    const grossProfit = roundMoney(totalRevenue - productCosts);
    const netProfit = roundMoney(grossProfit - employeeCosts - accountExpenses);

    const breakdown: Record<string, number> = {};
    for (const cat of EXPENSE_CATEGORIES) {
      breakdown[cat] = 0;
    }
    for (const row of expensesByCategory) {
      breakdown[row.category] = roundMoney(row._sum.amount ?? 0);
    }

    return {
      preset,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      currency: 'EUR',
      totalRevenue,
      pendingRevenue,
      completedServicesCount,
      averageRevenue,
      productCosts,
      employeeCosts,
      accountExpenses,
      grossProfit,
      netProfit,
      breakdown,
    };
  }

  async listExpenses() {
    const data = await this.prisma.financeExpense.findMany({
      where: { active: true },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    return { data: data.map((row) => this.mapExpense(row)), total: data.length };
  }

  async createExpense(dto: CreateFinanceExpenseDto) {
    const occurredAt = this.parseDate(dto.occurredAt, 'occurredAt');
    const created = await this.prisma.financeExpense.create({
      data: {
        label: dto.label.trim(),
        category: dto.category,
        amount: roundMoney(dto.amount),
        occurredAt,
        notes: dto.notes?.trim() || null,
      },
    });
    return this.mapExpense(created);
  }

  async updateExpense(id: string, dto: UpdateFinanceExpenseDto) {
    await this.findActiveExpenseOrThrow(id);
    const updated = await this.prisma.financeExpense.update({
      where: { id },
      data: {
        ...(dto.label != null ? { label: dto.label.trim() } : {}),
        ...(dto.category != null ? { category: dto.category } : {}),
        ...(dto.amount != null ? { amount: roundMoney(dto.amount) } : {}),
        ...(dto.occurredAt != null
          ? { occurredAt: this.parseDate(dto.occurredAt, 'occurredAt') }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
    });
    return this.mapExpense(updated);
  }

  async deleteExpense(id: string) {
    await this.findActiveExpenseOrThrow(id);
    await this.prisma.financeExpense.update({
      where: { id },
      data: { active: false },
    });
    return { ok: true };
  }

  async listEmployeeCosts() {
    const technicians = await this.prisma.user.findMany({
      where: { role: Role.TECHNICIAN, active: true },
      orderBy: { name: 'asc' },
      include: { employeeCost: true },
    });

    return {
      data: technicians.map((tech) => ({
        userId: tech.id,
        userName: tech.name,
        role: tech.role,
        monthlyCost: tech.employeeCost?.monthlyCost ?? 0,
        effectiveFrom: (tech.employeeCost?.effectiveFrom ?? tech.createdAt).toISOString(),
      })),
    };
  }

  async upsertEmployeeCost(userId: string, dto: UpsertEmployeeCostDto) {
    const technician = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!technician || !technician.active) {
      throw new NotFoundException('Técnico não encontrado');
    }
    if (technician.role !== Role.TECHNICIAN) {
      throw new ForbiddenException('Custos só podem ser definidos para técnicos');
    }

    const effectiveFrom = dto.effectiveFrom
      ? this.parseDate(dto.effectiveFrom, 'effectiveFrom')
      : new Date();

    const row = await this.prisma.employeeCost.upsert({
      where: { userId },
      create: {
        userId,
        monthlyCost: roundMoney(dto.monthlyCost),
        effectiveFrom,
      },
      update: {
        monthlyCost: roundMoney(dto.monthlyCost),
        effectiveFrom,
      },
    });

    return {
      userId: technician.id,
      userName: technician.name,
      role: technician.role,
      monthlyCost: row.monthlyCost,
      effectiveFrom: row.effectiveFrom.toISOString(),
    };
  }

  private async computeEmployeeCosts(period: FinancePeriod): Promise<number> {
    const technicians = await this.prisma.user.findMany({
      where: { role: Role.TECHNICIAN, active: true },
      include: { employeeCost: true },
    });

    let total = 0;
    for (const tech of technicians) {
      if (!tech.employeeCost) continue;
      total += prorateMonthlyCost(
        tech.employeeCost.monthlyCost,
        period,
        tech.employeeCost.effectiveFrom,
      );
    }
    return roundMoney(total);
  }

  private mapExpense(row: {
    id: string;
    label: string;
    category: string;
    amount: number;
    occurredAt: Date;
    notes: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      label: row.label,
      category: row.category,
      amount: row.amount,
      occurredAt: row.occurredAt.toISOString().slice(0, 10),
      notes: row.notes,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async findActiveExpenseOrThrow(id: string) {
    const expense = await this.prisma.financeExpense.findUnique({ where: { id } });
    if (!expense || !expense.active) {
      throw new NotFoundException('Despesa não encontrada');
    }
    return expense;
  }

  private parseDate(value: string, field: string): Date {
    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException(`${field} deve ser YYYY-MM-DD`);
    }
    const date = new Date(`${trimmed}T12:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} inválido`);
    }
    return date;
  }
}
