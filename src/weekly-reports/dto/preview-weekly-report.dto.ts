import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class PreviewWeeklyReportDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  weekStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  weekEnd?: string;
}
