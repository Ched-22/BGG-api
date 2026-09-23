import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertEmployeeCostDto {
  @IsNumber()
  @Min(0)
  monthlyCost: number;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;
}
