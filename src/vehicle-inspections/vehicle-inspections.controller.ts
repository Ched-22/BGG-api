import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AssignmentQueryDto } from './dto/assignment.dto';
import { UpsertInspectionDto } from './dto/upsert-inspection.dto';
import { VehicleInspectionsService } from './vehicle-inspections.service';

type AuthRequest = {
  user: { id: string; email: string; role: Role; name?: string };
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TECHNICIAN)
@Controller('vehicle-inspections')
export class VehicleInspectionsController {
  constructor(private readonly service: VehicleInspectionsService) {}

  @Get('by-assignment/report')
  getReport(@Query() query: AssignmentQueryDto, @Req() req: AuthRequest) {
    return this.service.getReport(query, req.user);
  }

  @Get('by-assignment')
  findByAssignment(@Query() query: AssignmentQueryDto, @Req() req: AuthRequest) {
    return this.service.findByAssignment(query, req.user);
  }

  @Put('by-assignment')
  upsert(@Body() dto: UpsertInspectionDto, @Req() req: AuthRequest) {
    return this.service.upsert(dto, req.user);
  }

  @Patch('by-assignment/finalize-entry')
  finalizeEntry(@Body() dto: AssignmentQueryDto, @Req() req: AuthRequest) {
    return this.service.finalizeEntry(dto, req.user);
  }

  @Patch('by-assignment/finalize-exit')
  finalizeExit(@Body() dto: AssignmentQueryDto, @Req() req: AuthRequest) {
    return this.service.finalizeExit(dto, req.user);
  }

  @Patch('by-assignment/submit-for-review')
  submitForReview(@Body() dto: AssignmentQueryDto, @Req() req: AuthRequest) {
    return this.service.submitForReview(dto, req.user);
  }

  @Get('by-assignment/admin-detail')
  @Roles(Role.ADMIN)
  getAdminDetailByAssignment(@Query() query: AssignmentQueryDto, @Req() req: AuthRequest) {
    return this.service.getAdminDetailByAssignment(query, req.user);
  }
}
