import {
    Controller, Get, Post, Body, Patch,
    Param, Delete, UseGuards, Query,
  } from '@nestjs/common';
  import { ClientsService } from './clients.service';
  import { CreateClientDto } from './dto/create-client.dto';
  import { UpdateClientDto } from './dto/update-client.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  
  @UseGuards(JwtAuthGuard)
  @Controller('clients')
  export class ClientsController {
    constructor(private clientsService: ClientsService) {}
  
    @Post()
    create(@Body() dto: CreateClientDto) {
      return this.clientsService.create(dto);
    }
  
    @Get()
    findAll(@Query('search') search?: string) {
      if (search) return this.clientsService.search(search);
      return this.clientsService.findAll();
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.clientsService.findOne(id);
    }
  
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
      return this.clientsService.update(id, dto);
    }
  
    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.clientsService.remove(id);
    }
  }