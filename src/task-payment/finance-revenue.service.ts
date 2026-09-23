import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  FINANCE_PRESETS,
  FinancePeriod,
  resolveFinancePeriod,
  roundMoney,
} from '../finance/finance-period';
import { FinanceRevenueQueryDto } from './dto/finance-revenue-query.dto';
import {
  derivePaymentStatus,
  isPaymentStatus,
  readOrcamentoAmounts,
  REVENUE_ELIGIBLE_STATUSES,
} from './payment.util';

type RevenueTask = {
  displayId: string;
  cliente: string;
  servico: string;
  orcamento: Prisma.JsonValue | null;
  updatedAt: Date;
  payment: {
    settlementStatus: string;
    paymentMethod: string | null;
    amount: number | null;
    isInstallment: boolean;
    installmentCount: number | null;
    installmentsPaid: number;
    paidAt: Date | null;
  } | null;
};

@Injectable()
export class FinanceRevenueService {
  constructor(private prisma: PrismaService) {}

  async getSummary(dto: FinanceRevenueQueryDto) {
    const period = this.resolvePeriod(dto);
    const items = await this.loadEligibleTasks(period);
    const buckets = this.buildBuckets(items, period);

    return {
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      currency: 'EUR',
      pendingCount: buckets.pending.count,
      pendingTotal: buckets.pending.total,
      installmentsOpenCount: buckets.installmentsOpen.count,
      installmentsOpenTotal: buckets.installmentsOpen.total,
      completedCount: buckets.completed.count,
      completedTotal: buckets.completed.total,
      totalRevenue: buckets.completed.total,
    };
  }

  async listRevenue(dto: FinanceRevenueQueryDto) {
    const period = this.resolvePeriod(dto);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const items = await this.loadEligibleTasks(period);
    const mapped = items
      .map((task) => this.mapItem(task))
      .filter((item) => (
        !dto.paymentStatus || item.paymentStatus === dto.paymentStatus
      ))
      .sort((a, b) => (
        (b.serviceCompletedAt || '').localeCompare(a.serviceCompletedAt || '')
      ));

    const total = mapped.length;
    const start = (page - 1) * limit;
    const data = mapped.slice(start, start + limit);

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async aggregateRevenueForSummary(period: FinancePeriod) {
    const items = await this.loadEligibleTasks(period);
    const buckets = this.buildBuckets(items, period);
    return {
      totalRevenue: buckets.completed.total,
      pendingRevenue: buckets.pending.total,
      completedServicesCount: buckets.completed.count,
    };
  }

  private resolvePeriod(dto: FinanceRevenueQueryDto): FinancePeriod {
    const customStart = dto.periodStart?.trim();
    const customEnd = dto.periodEnd?.trim();

    if (customStart || customEnd) {
      if (!customStart || !customEnd) {
        throw new BadRequestException('Informe data de início e fim do período');
      }
      return resolveFinancePeriod({
        periodStart: customStart,
        periodEnd: customEnd,
      });
    }

    const preset = dto.preset?.trim() || 'month';
    if (!FINANCE_PRESETS.includes(preset as (typeof FINANCE_PRESETS)[number])) {
      throw new BadRequestException(
        `preset inválido (use ${FINANCE_PRESETS.join(', ')})`,
      );
    }
    return resolveFinancePeriod({ preset });
  }

  private async loadEligibleTasks(period: FinancePeriod): Promise<RevenueTask[]> {
    return this.prisma.task.findMany({
      where: {
        status: { in: [...REVENUE_ELIGIBLE_STATUSES] },
        updatedAt: {
          gte: period.windowStart,
          lte: period.windowEnd,
        },
      },
      select: {
        displayId: true,
        cliente: true,
        servico: true,
        orcamento: true,
        updatedAt: true,
        payment: {
          select: {
            settlementStatus: true,
            paymentMethod: true,
            amount: true,
            isInstallment: true,
            installmentCount: true,
            installmentsPaid: true,
            paidAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private mapItem(task: RevenueTask) {
    const amounts = readOrcamentoAmounts(task.orcamento);
    const paymentShape = task.payment ?? {
      settlementStatus: 'pending',
      isInstallment: false,
      installmentCount: null,
      installmentsPaid: 0,
    };
    const paymentStatus = derivePaymentStatus(paymentShape);
    const amountDue = roundMoney(task.payment?.amount ?? amounts.saldo);

    return {
      taskDisplayId: task.displayId,
      clientName: task.cliente,
      serviceLabel: task.servico,
      quoteAmount: amounts.valor,
      amountDue,
      settlementStatus: paymentShape.settlementStatus,
      paymentStatus,
      paymentMethod: task.payment?.paymentMethod ?? null,
      isInstallment: task.payment?.isInstallment ?? false,
      installmentCount: task.payment?.installmentCount ?? null,
      installmentsPaid: task.payment?.installmentsPaid ?? 0,
      serviceCompletedAt: task.updatedAt.toISOString(),
      paidAt: task.payment?.paidAt?.toISOString() ?? null,
    };
  }

  private buildBuckets(items: RevenueTask[], period: FinancePeriod) {
    const buckets = {
      pending: { count: 0, total: 0 },
      installmentsOpen: { count: 0, total: 0 },
      completed: { count: 0, total: 0 },
    };

    for (const task of items) {
      const item = this.mapItem(task);
      if (!isPaymentStatus(item.paymentStatus)) continue;

      const includeInCompleted = item.paymentStatus === 'completed'
        && item.paidAt
        && this.isInPeriod(new Date(item.paidAt), period);

      if (item.paymentStatus === 'pending') {
        buckets.pending.count += 1;
        buckets.pending.total = roundMoney(buckets.pending.total + item.amountDue);
      } else if (item.paymentStatus === 'installmentsOpen') {
        buckets.installmentsOpen.count += 1;
        buckets.installmentsOpen.total = roundMoney(
          buckets.installmentsOpen.total + item.amountDue,
        );
      } else if (includeInCompleted || (item.paymentStatus === 'completed' && !item.paidAt)) {
        buckets.completed.count += 1;
        buckets.completed.total = roundMoney(buckets.completed.total + item.amountDue);
      }
    }

    return buckets;
  }

  private isInPeriod(date: Date, period: FinancePeriod) {
    return date >= period.windowStart && date <= period.windowEnd;
  }
}
