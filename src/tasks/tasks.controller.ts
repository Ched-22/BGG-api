import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { NotifyPickupDto } from './dto/notify-pickup.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

type AuthRequest = {
  user: { id: string; email: string; role: Role; name?: string };
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  findAll(@Req() req: AuthRequest) {
    return this.tasksService.findAll(req.user);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTaskDto, @Req() req: AuthRequest) {
    return this.tasksService.create(dto, req.user);
  }

  @Patch(':id/notify-ready-for-pickup')
  @Roles(Role.ADMIN)
  notifyReadyForPickup(
    @Param('id') id: string,
    @Body() dto: NotifyPickupDto,
    @Req() req: AuthRequest,
  ) {
    return this.tasksService.notifyReadyForPickup(id, dto.qaNotes, req.user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: AuthRequest,
  ) {
    return this.tasksService.update(id, dto, req.user);
  }
}
