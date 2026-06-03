import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { NotificationsService } from '../notifications/notifications.service';

const userSelect = {
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
  },
};

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService,
  private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateAppointmentDto) {
    const appointment = await this.prisma.appointment.create({
      data: {
        ...dto,
        scheduledAt: new Date(dto.scheduledAt),
      },
      include: {
        vehicle: { include: { client: true } },
        user: userSelect,
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

  async findAll() {
    return this.prisma.appointment.findMany({
      include: {
        vehicle: { include: { client: true } },
        user: userSelect,
        checklist: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        vehicle: { include: { client: true } },
        user: userSelect,
        checklist: { include: { items: true } },
      },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado');
    return appointment;
  }

  async findByStatus(status: string) {
    return this.prisma.appointment.findMany({
      where: { status: status as any },
      include: {
        vehicle: { include: { client: true } },
        user: userSelect,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findToday() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return this.prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: start, lte: end },
      },
      include: {
        vehicle: { include: { client: true } },
        user: userSelect,
        checklist: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    await this.findOne(id);
    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
      },
      include: {
        vehicle: { include: { client: true } },
        user: userSelect,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.appointment.delete({ where: { id } });
  }
}