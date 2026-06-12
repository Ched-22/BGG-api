import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateInventoryProductDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsString()
  unit: string;

  @IsInt()
  @Min(0)
  currentQuantity: number;

  @IsInt()
  @Min(1)
  maxCapacity: number;

  @IsOptional()
  @IsString()
  supplier?: string;
}
