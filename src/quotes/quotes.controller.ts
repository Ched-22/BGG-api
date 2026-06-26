import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { FindQuotesDto } from './dto/find-quotes.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

type AuthRequest = {
  user: { id: string; email: string; role: Role; name?: string };
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  create(@Body() dto: CreateQuoteDto, @Req() req: AuthRequest) {
    return this.quotesService.create(dto, req.user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  findAll(@Query() dto: FindQuotesDto, @Req() req: AuthRequest) {
    return this.quotesService.findAll(dto, req.user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  findOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.quotesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
    @Req() req: AuthRequest,
  ) {
    return this.quotesService.update(id, dto, req.user);
  }

  @Patch(':id/submit')
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  submit(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.quotesService.submit(id, req.user);
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN)
  approve(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.quotesService.approve(id, req.user);
  }

  @Patch(':id/send')
  @Roles(Role.ADMIN)
  send(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.quotesService.sendToClient(id, req.user);
  }

  @Patch(':id/resend')
  @Roles(Role.ADMIN)
  resend(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.quotesService.resendToClient(id, req.user);
  }

  @Post(':id/create-task')
  @Roles(Role.ADMIN)
  createTask(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.quotesService.createTaskFromQuote(id, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.quotesService.remove(id);
  }
}
