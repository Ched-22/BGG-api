import { Controller, Get, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ListInAppNotificationsDto } from './dto/list-in-app-notifications.dto';
import { InAppNotificationsService } from './in-app-notifications.service';

type AuthRequest = {
  user: { id: string; email: string; role: Role; name?: string };
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TECHNICIAN)
@Controller('in-app-notifications')
export class InAppNotificationsController {
  constructor(private readonly service: InAppNotificationsService) {}

  @Get()
  list(@Query() query: ListInAppNotificationsDto, @Req() req: AuthRequest) {
    return this.service.listForUser(req.user, query);
  }

  @Get('unread-count')
  unreadCount(@Req() req: AuthRequest) {
    return this.service.unreadCount(req.user);
  }

  @Patch('read-all')
  markAllRead(@Req() req: AuthRequest) {
    return this.service.markAllRead(req.user);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.markRead(id, req.user);
  }
}
