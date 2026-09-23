import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UsersMeService } from './users-me.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users/me')
export class UsersMeController {
  constructor(private usersMeService: UsersMeService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  getMe(@Req() req: { user: { id: string; email: string; role: Role } }) {
    return this.usersMeService.getMe(req.user);
  }

  @Patch()
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  updateMe(
    @Req() req: { user: { id: string; email: string; role: Role } },
    @Body() dto: UpdateMyProfileDto,
  ) {
    return this.usersMeService.updateMe(req.user, dto);
  }
}
