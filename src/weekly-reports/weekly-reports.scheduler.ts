import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WeeklyReportsService } from './weekly-reports.service';

@Injectable()
export class WeeklyReportsScheduler {
  private readonly logger = new Logger(WeeklyReportsScheduler.name);

  constructor(private weeklyReportsService: WeeklyReportsService) {}

  @Cron('0 8 * * 0', { timeZone: 'Europe/Lisbon' })
  async handleWeeklyReportCron(): Promise<void> {
    if (process.env.WEEKLY_REPORT_CRON_ENABLED === 'false') {
      return;
    }

    try {
      const result = await this.weeklyReportsService.sendWeeklyReport();
      this.logger.log(
        `Relatório semanal enviado (${result.weekStart}–${result.weekEnd}) para ${result.recipients.length} destinatário(s).`,
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        this.logger.log('Relatório semanal já enviado para esta semana; cron ignorado.');
        return;
      }
      this.logger.error('Falha ao enviar relatório semanal via cron', error);
    }
  }
}
