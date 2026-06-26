import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PreviewWeeklyReportDto } from './dto/preview-weekly-report.dto';
import { SendWeeklyReportDto } from './dto/send-weekly-report.dto';
import { WeeklyReportsService } from './weekly-reports.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('reports/weekly')
export class WeeklyReportsController {
  constructor(private weeklyReportsService: WeeklyReportsService) {}

  @Get('preview')
  preview(@Query() dto: PreviewWeeklyReportDto) {
    return this.weeklyReportsService.getPreview(dto.weekStart);
  }

  @Post('send')
  send(@Body() dto: SendWeeklyReportDto) {
    return this.weeklyReportsService.sendWeeklyReport({
      weekStart: dto.weekStart,
      dryRun: dto.dryRun,
      force: dto.force,
    });
  }
}
