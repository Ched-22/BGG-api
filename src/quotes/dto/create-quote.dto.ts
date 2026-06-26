import { IsString, IsOptional, IsNumber, IsEnum, IsArray, IsUUID, IsIn } from 'class-validator';
import { CLIENT_PREFERRED_LANGUAGES } from '../../common/client-preferred-language';

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
}

export class CreateQuoteDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsString()
  clientName: string;

  @IsString()
  clientPhoneCountryCode: string;

  @IsString()
  clientPhoneNationalNumber: string;

  @IsString()
  @IsOptional()
  clientEmail?: string;

  @IsString()
  plate: string;

  @IsString()
  @IsOptional()
  plateCountry?: string;

  @IsString()
  brand: string;

  @IsString()
  model: string;

  @IsNumber()
  year: number;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  km?: number;

  @IsString()
  @IsOptional()
  vehicleSize?: string;

  @IsArray()
  services: any[];

  @IsNumber()
  @IsOptional()
  discount?: number;

  /** Valor total manual (substitui o calculado a partir dos snapshots). */
  @IsNumber()
  @IsOptional()
  totalOverride?: number;

  @IsNumber()
  @IsOptional()
  total?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  internalNote?: string;

  @IsEnum(QuoteStatus)
  @IsOptional()
  status?: QuoteStatus;

  @IsString()
  @IsOptional()
  linkedTaskDisplayId?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsOptional()
  @IsIn([...CLIENT_PREFERRED_LANGUAGES])
  clientPreferredLanguage?: string;
}