import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users/admins')
export class AdminsController {
  constructor(private adminsService: AdminsService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.adminsService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateAdminDto) {
    return this.adminsService.create(dto);
  }
}
