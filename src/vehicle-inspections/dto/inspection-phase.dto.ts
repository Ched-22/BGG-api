import { BadRequestException } from '@nestjs/common';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { isValidItemKey } from '../inspection-item-keys';

export class InspectionItemDto {
  @IsString()
  itemKey: string;

  @IsOptional()
  @IsIn(['ok', 'warn', 'na'])
  status?: 'ok' | 'warn' | 'na' | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  photoUrls?: string[];
}

export class InspectionPhaseDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  generalPhotoUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionItemDto)
  items?: InspectionItemDto[];
}

export function validateItemKeys(items: InspectionItemDto[] | undefined): void {
  if (!items) return;
  for (const item of items) {
    if (!isValidItemKey(item.itemKey)) {
      throw new BadRequestException(`itemKey inválido: ${item.itemKey}`);
    }
  }
}
