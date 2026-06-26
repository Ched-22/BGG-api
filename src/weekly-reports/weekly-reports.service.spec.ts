import { ConflictException } from '@nestjs/common';
import { QuoteStatus } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { WeeklyReportsService } from './weekly-reports.service';

describe('WeeklyReportsService', () => {
  const window = {
    weekStart: '2026-05-26',
    weekEnd: '2026-06-01',
    windowStart: new Date('2026-05-25T23:00:00.000Z'),
    windowEnd: new Date('2026-06-01T22:59:59.999Z'),
  };

  const metrics = {
    weekStart: window.weekStart,
    weekEnd: window.weekEnd,
    quotedServicesCount: 2,
    scheduledServicesCount: 1,
    completedServicesCount: 1,
    newClientsCount: 1,
    totalRevenueReceived: 500,
    currency: 'EUR',
  };

  let prisma: {
    quote: { count: jest.Mock };
    task: { count: jest.Mock; findMany: jest.Mock };
    client: { count: jest.Mock };
    user: { findMany: jest.Mock };
    weeklyReportLog: { findUnique: jest.Mock; upsert: jest.Mock };
  };
  let mailService: { sendMail: jest.Mock };
  let service: WeeklyReportsService;

  beforeEach(() => {
    prisma = {
      quote: { count: jest.fn().mockResolvedValue(2) },
      task: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          { dataAgendada: '2026-05-28' },
          { orcamento: { valor: 500 } },
        ]),
      },
      client: { count: jest.fn().mockResolvedValue(1) },
      user: { findMany: jest.fn().mockResolvedValue([{ email: 'admin@bgggarage.com' }]) },
      weeklyReportLog: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    mailService = { sendMail: jest.fn().mockResolvedValue(undefined) };
    service = new WeeklyReportsService(
      prisma as unknown as PrismaService,
      mailService as unknown as MailService,
    );

    jest.spyOn(service, 'buildMetrics').mockResolvedValue(metrics);
    delete process.env.WEEKLY_REPORT_EMAIL_OVERRIDE;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds quoted count with pending and approved only', async () => {
    jest.restoreAllMocks();
    const liveService = new WeeklyReportsService(
      prisma as unknown as PrismaService,
      mailService as unknown as MailService,
    );

    await liveService.buildMetrics(window);

    expect(prisma.quote.count).toHaveBeenCalledWith({
      where: {
        createdAt: { gte: window.windowStart, lte: window.windowEnd },
        status: { in: [QuoteStatus.PENDING, QuoteStatus.APPROVED] },
      },
    });
  });

  it('sends one email per admin recipient', async () => {
    const result = await service.sendWeeklyReport();

    expect(mailService.sendMail).toHaveBeenCalledTimes(1);
    expect(result.recipients).toEqual(['admin@bgggarage.com']);
    expect(result.sentAt).toBeTruthy();
  });

  it('uses email override when configured', async () => {
    process.env.WEEKLY_REPORT_EMAIL_OVERRIDE = 'pedro@devdeals.app';

    const result = await service.sendWeeklyReport();

    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(result.recipients).toEqual(['pedro@devdeals.app']);
    delete process.env.WEEKLY_REPORT_EMAIL_OVERRIDE;
  });

  it('throws conflict when week already sent', async () => {
    prisma.weeklyReportLog.findUnique.mockResolvedValue({ id: 'log-1' });

    await expect(service.sendWeeklyReport()).rejects.toBeInstanceOf(ConflictException);
  });

  it('skips send on dry run', async () => {
    const result = await service.sendWeeklyReport({ dryRun: true });

    expect(mailService.sendMail).not.toHaveBeenCalled();
    expect(result.sentAt).toBeNull();
  });
});
