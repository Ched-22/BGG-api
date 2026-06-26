import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { actorFromUser } from '../tasks/task-log';
import { CreateInventoryProductDto } from './dto/create-inventory-product.dto';
import { FindInventoryHistoryDto } from './dto/find-inventory-history.dto';
import { FindInventoryProductsDto } from './dto/find-inventory-products.dto';
import { UpdateInventoryProductDto } from './dto/update-inventory-product.dto';
import { InventoryService } from './inventory.service';

type AuthRequest = {
  user: { id: string; email: string; role: Role; name?: string };
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory/products')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  findAll(@Query() dto: FindInventoryProductsDto) {
    return this.inventoryService.findAll(dto);
  }

  @Get(':id/history')
  @Roles(Role.ADMIN)
  findHistory(
    @Param('id') id: string,
    @Query() dto: FindInventoryHistoryDto,
  ) {
    return this.inventoryService.findHistory(id, dto);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateInventoryProductDto, @Req() req: AuthRequest) {
    return this.inventoryService.create(dto, actorFromUser(req.user));
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryProductDto,
    @Req() req: AuthRequest,
  ) {
    return this.inventoryService.update(id, dto, actorFromUser(req.user));
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  deactivate(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.inventoryService.deactivate(id, actorFromUser(req.user));
  }
}
