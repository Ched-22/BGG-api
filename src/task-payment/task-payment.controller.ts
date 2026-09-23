import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpsertTaskPaymentDto } from './dto/upsert-task-payment.dto';
import { TaskPaymentService } from './task-payment.service';

type AuthRequest = {
  user: { id: string; email: string; role: Role; name?: string };
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TaskPaymentController {
  constructor(private taskPaymentService: TaskPaymentService) {}

  @Get(':displayId/payment')
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  getPayment(@Param('displayId') displayId: string) {
    return this.taskPaymentService.getByDisplayId(displayId);
  }

  @Put(':displayId/payment')
  @Roles(Role.ADMIN)
  upsertPayment(
    @Param('displayId') displayId: string,
    @Body() dto: UpsertTaskPaymentDto,
    @Req() req: AuthRequest,
  ) {
    return this.taskPaymentService.upsertByDisplayId(displayId, dto, req.user);
  }
}
