import { ServiceCategory } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class FindCatalogServicesDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive?: boolean;
}

export class CreateCatalogServiceDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsEnum(ServiceCategory)
  serviceCategory: ServiceCategory;

  @IsNumber()
  @Min(0)
  priceSmall: number;

  @IsNumber()
  @Min(0)
  priceMedium: number;

  @IsNumber()
  @Min(0)
  priceLarge: number;
}

export class UpdateCatalogServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsEnum(ServiceCategory)
  serviceCategory?: ServiceCategory;
}

export class PublishCatalogServicePricesDto {
  @IsNumber()
  @Min(0)
  priceSmall: number;

  @IsNumber()
  @Min(0)
  priceMedium: number;

  @IsNumber()
  @Min(0)
  priceLarge: number;
}
