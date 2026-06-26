import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const EXPENSE_CATEGORIES = ['fixed', 'variable', 'tax', 'other'] as const;

export class CreateFinanceExpenseDto {
  @IsString()
  label: string;

  @IsString()
  @IsIn([...EXPENSE_CATEGORIES])
  category: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  occurredAt: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFinanceExpenseDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  @IsIn([...EXPENSE_CATEGORIES])
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
