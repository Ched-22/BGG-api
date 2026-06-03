import {
    Controller, Get, Post, Body, Patch,
    Param, Delete, UseGuards,
  } from '@nestjs/common';
  import { ChecklistsService } from './checklists.service';
  import { CreateChecklistDto } from './dto/create-checklist.dto';
  import { UpdateChecklistItemDto } from './dto/update-checklist.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  
  @UseGuards(JwtAuthGuard)
  @Controller('checklists')
  export class ChecklistsController {
    constructor(private checklistsService: ChecklistsService) {}
  
    @Post()
    create(@Body() dto: CreateChecklistDto) {
      return this.checklistsService.create(dto);
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.checklistsService.findOne(id);
    }
  
    @Get('appointment/:appointmentId')
    findByAppointment(@Param('appointmentId') appointmentId: string) {
      return this.checklistsService.findByAppointment(appointmentId);
    }
  
    @Patch('items/:itemId')
    updateItem(@Param('itemId') itemId: string, @Body() dto: UpdateChecklistItemDto) {
      return this.checklistsService.updateItem(itemId, dto);
    }
  
    @Post(':id/items')
    addItem(
      @Param('id') id: string,
      @Body() body: { description: string; photoUrl?: string },
    ) {
      return this.checklistsService.addItem(id, body.description, body.photoUrl);
    }
  
    @Delete('items/:itemId')
    removeItem(@Param('itemId') itemId: string) {
      return this.checklistsService.removeItem(itemId);
    }
  
    @Patch(':id/complete')
    complete(@Param('id') id: string) {
      return this.checklistsService.complete(id);
    }
  }