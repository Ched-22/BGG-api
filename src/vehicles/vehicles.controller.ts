import {
    Controller, Get, Post, Body, Patch,
    Param, Delete, UseGuards,
  } from '@nestjs/common';
  import { VehiclesService } from './vehicles.service';
  import { CreateVehicleDto } from './dto/create-vehicle.dto';
  import { UpdateVehicleDto } from './dto/update-vehicle.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  
  @UseGuards(JwtAuthGuard)
  @Controller('vehicles')
  export class VehiclesController {
    constructor(private vehiclesService: VehiclesService) {}
  
    @Post()
    create(@Body() dto: CreateVehicleDto) {
      return this.vehiclesService.create(dto);
    }
  
    @Get()
    findAll() {
      return this.vehiclesService.findAll();
    }
  
    @Get('client/:clientId')
    findByClient(@Param('clientId') clientId: string) {
      return this.vehiclesService.findByClient(clientId);
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.vehiclesService.findOne(id);
    }
  
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
      return this.vehiclesService.update(id, dto);
    }
  
    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.vehiclesService.remove(id);
    }
  }