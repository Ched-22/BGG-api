import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateInventoryProductDto } from './create-inventory-product.dto';

export class UpdateInventoryProductDto extends PartialType(
  CreateInventoryProductDto,
) {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adjustmentNote?: string;
}
