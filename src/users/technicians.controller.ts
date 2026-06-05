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
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { FindTechniciansDto } from './dto/find-technicians.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { TechniciansService } from './technicians.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users/technicians')
export class TechniciansController {
  constructor(private techniciansService: TechniciansService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query() dto: FindTechniciansDto) {
    return this.techniciansService.findAll(dto);
  }

  @Get('me')
  @Roles(Role.TECHNICIAN)
  findMe(@Req() req: { user: { id: string; email: string; role: Role } }) {
    return this.techniciansService.findMe(req.user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  findOne(
    @Param('id') id: string,
    @Req() req: { user: { id: string; email: string; role: Role } },
  ) {
    return this.techniciansService.findOne(id, req.user);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTechnicianDto) {
    return this.techniciansService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTechnicianDto) {
    return this.techniciansService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.techniciansService.deactivate(id);
  }
}
