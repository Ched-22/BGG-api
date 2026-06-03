import { IsString, IsOptional, IsNumber, IsEnum, IsArray } from 'class-validator';

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
}

export class CreateQuoteDto {
  @IsString()
  clientName: string;

  @IsString()
  clientPhone: string;

  @IsString()
  @IsOptional()
  clientEmail?: string;

  @IsString()
  plate: string;

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
}