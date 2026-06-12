import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateInventoryProductDto } from './dto/create-inventory-product.dto';
import { FindInventoryProductsDto } from './dto/find-inventory-products.dto';
import { UpdateInventoryProductDto } from './dto/update-inventory-product.dto';
import { InventoryService } from './inventory.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory/products')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  findAll(@Query() dto: FindInventoryProductsDto) {
    return this.inventoryService.findAll(dto);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateInventoryProductDto) {
    return this.inventoryService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateInventoryProductDto) {
    return this.inventoryService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.inventoryService.deactivate(id);
  }
}
