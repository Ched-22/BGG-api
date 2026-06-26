import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export class FinanceSummaryQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['month', 'quarter', 'year'])
  preset?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  periodStart?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  periodEnd?: string;
}
