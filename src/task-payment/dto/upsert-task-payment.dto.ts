import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  PAYMENT_METHODS,
  SETTLEMENT_STATUSES,
} from '../payment.util';

export class UpsertTaskPaymentDto {
  @IsIn(SETTLEMENT_STATUSES)
  settlementStatus!: string;

  @ValidateIf((dto: UpsertTaskPaymentDto) => dto.settlementStatus !== 'pending')
  @IsIn(PAYMENT_METHODS)
  paymentMethod?: string;

  @ValidateIf(
    (dto: UpsertTaskPaymentDto) => (
      dto.settlementStatus !== 'pending'
      && (dto.paymentMethod === 'multibanco' || dto.paymentMethod === 'bankTransfer')
    ),
  )
  @IsString()
  iban?: string;

  @ValidateIf((dto: UpsertTaskPaymentDto) => dto.settlementStatus !== 'pending')
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsBoolean()
  isInstallment?: boolean;

  @ValidateIf((dto: UpsertTaskPaymentDto) => dto.isInstallment === true)
  @IsInt()
  @Min(2)
  installmentCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  installmentsPaid?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
