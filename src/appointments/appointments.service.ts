import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Appointment, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { assertNoScheduleConflict } from './appointment-schedule.util';

type AuthUser = { id: string; email: string; role: Role };

const userSelect = {
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
  },
};

const appointmentInclude = {
  vehicle: { include: { client: true } },
  user: userSelect,
};

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateAppointmentDto) {
    const scheduledAt = new Date(dto.scheduledAt);
    await assertNoScheduleConflict(this.prisma, dto.userId, scheduledAt);

    const appointment = await this.prisma.appointment.create({
      data: {
        ...dto,
        scheduledAt: new Date(dto.scheduledAt),
      },
      include: {
        ...appointmentInclude,
        checklist: true,
      },
    });
    await this.notificationsService.sendAppointmentConfirmation(
      appointment.vehicle.client.phone,
      appointment.vehicle.client.name,
      appointment.vehicle.brand,
      appointment.vehicle.model,
      appointment.scheduledAt,
    );
    return appointment;
  }

  async findAll(user: AuthUser) {
    return this.prisma.appointment.findMany({
      where: this.scopeForUser(user),
      include: {
        ...appointmentInclude,
        checklist: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findOne(id: string, user?: AuthUser) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        ...appointmentInclude,
        checklist: { include: { items: true } },
      },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado');
    if (user) this.assertCanAccess(appointment, user);
    return appointment;
  }

  async findByStatus(status: string, user: AuthUser) {
    return this.prisma.appointment.findMany({
      where: {
        status: status as any,
        ...this.scopeForUser(user),
      },
      include: appointmentInclude,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findToday(user: AuthUser) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return this.prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: start, lte: end },
        ...this.scopeForUser(user),
      },
      include: {
        ...appointmentInclude,
        checklist: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async update(id: string, dto: UpdateAppointmentDto, user: AuthUser) {
    const current = await this.getAppointmentOrThrow(id);
    this.assertCanAccess(current, user);

    const data =
      user.role === Role.TECHNICIAN
        ? this.pickTechnicianUpdate(dto)
        : dto;

    const userId = data.userId ?? current.userId;
    const scheduledAt = data.scheduledAt
      ? new Date(data.scheduledAt)
      : current.scheduledAt;

    if (user.role === Role.ADMIN) {
      await assertNoScheduleConflict(this.prisma, userId, scheduledAt, id);
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...data,
        ...(data.scheduledAt && { scheduledAt }),
        ...(data.userId && { userId: data.userId }),
      },
      include: appointmentInclude,
    });
  }

  async remove(id: string) {
    await this.getAppointmentOrThrow(id);
    return this.prisma.appointment.delete({ where: { id } });
  }

  private scopeForUser(user: AuthUser) {
    if (user.role === Role.TECHNICIAN) {
      return { userId: user.id };
    }
    return {};
  }

  private async getAppointmentOrThrow(id: string): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado');
    return appointment;
  }

  private assertCanAccess(appointment: Appointment, user: AuthUser) {
    if (user.role !== Role.TECHNICIAN) return;
    if (appointment.userId !== user.id) {
      throw new ForbiddenException('Sem permissão para aceder a este agendamento');
    }
  }

  private pickTechnicianUpdate(dto: UpdateAppointmentDto) {
    const allowed: UpdateAppointmentDto = {};
    if (dto.status !== undefined) allowed.status = dto.status;
    if (dto.notes !== undefined) allowed.notes = dto.notes;
    return allowed;
  }
}
