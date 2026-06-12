import { PartialType } from '@nestjs/mapped-types';
import { CreateInventoryProductDto } from './create-inventory-product.dto';

export class UpdateInventoryProductDto extends PartialType(CreateInventoryProductDto) {}
