import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { QuoteStatus, Role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildEmailBodies, buildEmailSubject } from './weekly-report-email';
import { resolveWeekWindow, WeekWindow } from './weekly-report-dates';
import { WeeklyReportMetrics, WeeklyReportResponse } from './weekly-reports.types';

type SendOptions = {
  weekStart?: string;
  dryRun?: boolean;
  force?: boolean;
};

@Injectable()
export class WeeklyReportsService {
  private readonly logger = new Logger(WeeklyReportsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async getPreview(weekStart?: string): Promise<WeeklyReportResponse> {
    const window = resolveWeekWindow(weekStart);
    const metrics = await this.buildMetrics(window);
    const recipients = await this.resolveRecipients();
    return this.toResponse(metrics, recipients, null);
  }

  async sendWeeklyReport(options: SendOptions = {}): Promise<WeeklyReportResponse> {
    const window = resolveWeekWindow(options.weekStart);
    const metrics = await this.buildMetrics(window);
    const recipients = await this.resolveRecipients();
    const emailSubject = buildEmailSubject(metrics.weekStart, metrics.weekEnd);

    if (!options.dryRun) {
      const existing = await this.prisma.weeklyReportLog.findUnique({
        where: { weekStart: metrics.weekStart },
      });
      if (existing && !options.force) {
        throw new ConflictException('Relatório desta semana já foi enviado.');
      }

      if (!recipients.length) {
        this.logger.warn('Nenhum destinatário para o relatório semanal.');
        return this.toResponse(metrics, recipients, null);
      }

      const adminAppUrl = process.env.ADMIN_APP_URL?.trim() || '';
      const { text, html } = buildEmailBodies(metrics, adminAppUrl);

      for (const to of recipients) {
        await this.mailService.sendMail({ to, subject: emailSubject, text, html });
      }

      const sentAt = new Date();
      await this.prisma.weeklyReportLog.upsert({
        where: { weekStart: metrics.weekStart },
        create: {
          weekStart: metrics.weekStart,
          weekEnd: metrics.weekEnd,
          metrics: metrics as unknown as Prisma.InputJsonValue,
          recipients,
          sentAt,
        },
        update: {
          weekEnd: metrics.weekEnd,
          metrics: metrics as unknown as Prisma.InputJsonValue,
          recipients,
          sentAt,
        },
      });

      return this.toResponse(metrics, recipients, sentAt.toISOString());
    }

    return this.toResponse(metrics, recipients, null);
  }

  async buildMetrics(window: WeekWindow): Promise<WeeklyReportMetrics> {
    const [
      quotedServicesCount,
      scheduledServicesCount,
      completedServicesCount,
      newClientsCount,
      totalRevenueReceived,
    ] = await Promise.all([
      this.countQuotedServices(window),
      this.countScheduledServices(window),
      this.countCompletedServices(window),
      this.countNewClients(window),
      this.sumCompletedRevenue(window),
    ]);

    return {
      weekStart: window.weekStart,
      weekEnd: window.weekEnd,
      quotedServicesCount,
      scheduledServicesCount,
      completedServicesCount,
      newClientsCount,
      totalRevenueReceived,
      currency: 'EUR',
    };
  }

  private async countQuotedServices(window: WeekWindow): Promise<number> {
    return this.prisma.quote.count({
      where: {
        createdAt: {
          gte: window.windowStart,
          lte: window.windowEnd,
        },
        status: {
          in: [QuoteStatus.PENDING, QuoteStatus.APPROVED],
        },
      },
    });
  }

  private async countScheduledServices(window: WeekWindow): Promise<number> {
    const tasks = await this.prisma.task.findMany({
      where: {
        status: { not: 'Cancelado' },
        dataAgendada: { not: null },
      },
      select: { dataAgendada: true },
    });

    return tasks.filter((task) => {
      const date = this.normalizeDateString(task.dataAgendada);
      if (!date) return false;
      return date >= window.weekStart && date <= window.weekEnd;
    }).length;
  }

  private async countCompletedServices(window: WeekWindow): Promise<number> {
    return this.prisma.task.count({
      where: {
        status: 'Concluído',
        updatedAt: {
          gte: window.windowStart,
          lte: window.windowEnd,
        },
      },
    });
  }

  private async countNewClients(window: WeekWindow): Promise<number> {
    return this.prisma.client.count({
      where: {
        createdAt: {
          gte: window.windowStart,
          lte: window.windowEnd,
        },
      },
    });
  }

  private async sumCompletedRevenue(window: WeekWindow): Promise<number> {
    const tasks = await this.prisma.task.findMany({
      where: {
        status: 'Concluído',
        updatedAt: {
          gte: window.windowStart,
          lte: window.windowEnd,
        },
      },
      select: { orcamento: true },
    });

    return tasks.reduce((sum, task) => sum + this.readOrcamentoValor(task.orcamento), 0);
  }

  private readOrcamentoValor(orcamento: Prisma.JsonValue | null): number {
    if (!orcamento || typeof orcamento !== 'object' || Array.isArray(orcamento)) {
      return 0;
    }
    const value = (orcamento as { valor?: unknown }).valor;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private normalizeDateString(value: string | null | undefined): string | null {
    if (!value?.trim()) return null;
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return null;
  }

  private async resolveRecipients(): Promise<string[]> {
    const override = process.env.WEEKLY_REPORT_EMAIL_OVERRIDE?.trim();
    if (override) return [override];

    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN, active: true },
      select: { email: true },
      orderBy: { email: 'asc' },
    });

    return admins.map((admin) => admin.email);
  }

  private toResponse(
    metrics: WeeklyReportMetrics,
    recipients: string[],
    sentAt: string | null,
  ): WeeklyReportResponse {
    return {
      ...metrics,
      recipients,
      sentAt,
      emailSubject: buildEmailSubject(metrics.weekStart, metrics.weekEnd),
    };
  }
}
