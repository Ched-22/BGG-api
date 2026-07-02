import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PAYMENT_STATUSES } from '../payment.util';

export class FinanceRevenueQueryDto {
  @IsOptional()
  @IsString()
  preset?: string;

  @IsOptional()
  @IsString()
  periodStart?: string;

  @IsOptional()
  @IsString()
  periodEnd?: string;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
