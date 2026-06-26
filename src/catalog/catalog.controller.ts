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
import { ServiceCatalogService } from './catalog.service';
import {
  CreateCatalogServiceDto,
  FindCatalogServicesDto,
  PublishCatalogServicePricesDto,
  UpdateCatalogServiceDto,
} from './dto/catalog-service.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('catalog/services')
export class CatalogController {
  constructor(private catalogService: ServiceCatalogService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  findAll(
    @Query() dto: FindCatalogServicesDto,
    @Req() req: { user: { id: string; role: Role } },
  ) {
    return this.catalogService.findAll(dto, req.user);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.catalogService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateCatalogServiceDto) {
    return this.catalogService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCatalogServiceDto) {
    return this.catalogService.update(id, dto);
  }

  @Post(':id/prices')
  @Roles(Role.ADMIN)
  publishPrices(
    @Param('id') id: string,
    @Body() dto: PublishCatalogServicePricesDto,
  ) {
    return this.catalogService.publishNewPrices(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.catalogService.deactivate(id);
  }
}
