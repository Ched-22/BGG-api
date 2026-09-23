import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { WeeklyReportsController } from './weekly-reports.controller';
import { WeeklyReportsScheduler } from './weekly-reports.scheduler';
import { WeeklyReportsService } from './weekly-reports.service';

@Module({
  imports: [MailModule],
  controllers: [WeeklyReportsController],
  providers: [WeeklyReportsService, WeeklyReportsScheduler],
})
export class WeeklyReportsModule {}
