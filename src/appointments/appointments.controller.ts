import {
    Controller, Get, Post, Body, Patch,
    Param, Delete, UseGuards, Query,
  } from '@nestjs/common';
  import { AppointmentsService } from './appointments.service';
  import { CreateAppointmentDto } from './dto/create-appointment.dto';
  import { UpdateAppointmentDto } from './dto/update-appointment.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  
  @UseGuards(JwtAuthGuard)
  @Controller('appointments')
  export class AppointmentsController {
    constructor(private appointmentsService: AppointmentsService) {}
  
    @Post()
    create(@Body() dto: CreateAppointmentDto) {
      return this.appointmentsService.create(dto);
    }
  
    @Get()
    findAll(@Query('status') status?: string) {
      if (status) return this.appointmentsService.findByStatus(status);
      return this.appointmentsService.findAll();
    }
  
    @Get('today')
    findToday() {
      return this.appointmentsService.findToday();
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.appointmentsService.findOne(id);
    }
  
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
      return this.appointmentsService.update(id, dto);
    }
  
    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.appointmentsService.remove(id);
    }
  }