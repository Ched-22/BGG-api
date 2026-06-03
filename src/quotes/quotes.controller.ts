import {
    Controller, Get, Post, Body, Patch,
    Param, Delete, UseGuards, Query,
  } from '@nestjs/common';
  import { QuotesService } from './quotes.service';
  import { CreateQuoteDto } from './dto/create-quote.dto';
  import { UpdateQuoteDto } from './dto/update-quote.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  
  @UseGuards(JwtAuthGuard)
  @Controller('quotes')
  export class QuotesController {
    constructor(private quotesService: QuotesService) {}
  
    @Post()
    create(@Body() dto: CreateQuoteDto) {
      return this.quotesService.create(dto);
    }
  
    @Get()
    findAll(@Query('status') status?: string) {
      return this.quotesService.findAll(status);
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.quotesService.findOne(id);
    }
  
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateQuoteDto) {
      return this.quotesService.update(id, dto);
    }
  
    @Patch(':id/submit')
    submit(@Param('id') id: string) {
      return this.quotesService.submit(id);
    }
  
    @Patch(':id/approve')
    approve(@Param('id') id: string) {
      return this.quotesService.approve(id);
    }
  
    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.quotesService.remove(id);
    }
  }