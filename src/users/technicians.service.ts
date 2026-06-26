import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma, Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { findTechnicianIdsWithScheduleConflict } from '../appointments/appointment-schedule.util';
import { ServiceCatalogService } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { FindTechniciansDto } from './dto/find-technicians.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import {
  ACTIVE_APPOINTMENT_STATUSES,
  ACTIVE_TASK_STATUSES,
  getCurrentMonthRange,
  getTodayBounds,
  getTodayDateString,
  sumScheduledHours,
} from './technician-metrics';
import {
  buildStats,
  mapTechnicianDetail,
  mapTechnicianListItem,
} from './technicians.mapper';

type JwtUser = { id: string; email: string; role: Role };

@Injectable()
export class TechniciansService {
  private readonly logger = new Logger(TechniciansService.name);

  constructor(
    private prisma: PrismaService,
    private catalogService: ServiceCatalogService,
  ) {}

  async findAll(dto: FindTechniciansDto) {
    const conflictIds = await findTechnicianIdsWithScheduleConflict(this.prisma);
    const where = this.buildListWhere(dto, conflictIds);
    const skip = (dto.page - 1) * dto.limit;

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: dto.limit,
        include: {
          technicianServices: {
            include: { catalogService: { select: { id: true, code: true, name: true, serviceCategory: true, active: true } } },
          },
        },
      }),
    ]);

    const data = await Promise.all(
      users.map(async (user) => {
        const stats = await this.getStatsForUser(user.id, conflictIds);
        return mapTechnicianListItem(user, stats);
      }),
    );

    return {
      data,
      page: dto.page,
      limit: dto.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / dto.limit)),
    };
  }

  async findOne(id: string, requester: JwtUser) {
    this.assertCanRead(id, requester);
    const user = await this.findTechnicianOrThrow(id, {
      includeInactive: requester.role === Role.ADMIN,
      includeServices: true,
    });

    const conflictIds = await findTechnicianIdsWithScheduleConflict(this.prisma);
    const stats = await this.getStatsForUser(user.id, conflictIds);

    const [appointments, assignedTasks] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { userId: id },
        include: { vehicle: true },
        orderBy: { scheduledAt: 'desc' },
        take: 50,
      }),
      this.prisma.task.findMany({
        where: {
          tecnico: { equals: user.name, mode: 'insensitive' },
          status: { not: 'Cancelado' },
        },
        orderBy: [{ dataAgendada: 'desc' }, { createdAt: 'desc' }],
        take: 50,
      }),
    ]);

    return mapTechnicianDetail({ ...user, appointments }, stats, assignedTasks);
  }

  async getStatsForTechnician(userId: string) {
    const conflictIds = await findTechnicianIdsWithScheduleConflict(this.prisma);
    return this.getStatsForUser(userId, conflictIds);
  }

  async create(dto: CreateTechnicianDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('E-mail já registado');
    }

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hash,
        role: Role.TECHNICIAN,
        phoneCountryCode: dto.phoneCountryCode,
        phoneNationalNumber: dto.phoneNationalNumber,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        skills: dto.skills ?? [],
        scheduleLabel: dto.scheduleLabel,
        workloadHours: dto.workloadHours ?? 0,
        available: dto.available ?? true,
      },
    });

    if (dto.serviceIds?.length) {
      await this.catalogService.syncTechnicianServices(user.id, dto.serviceIds);
    }

    const withServices = await this.findTechnicianOrThrow(user.id, {
      includeInactive: true,
      includeServices: true,
    });

    this.logger.log(`Technician created: ${user.id}`);
    const conflictIds = await findTechnicianIdsWithScheduleConflict(this.prisma);
    const stats = await this.getStatsForUser(user.id, conflictIds);
    return mapTechnicianListItem(withServices, stats);
  }

  async update(id: string, dto: UpdateTechnicianDto) {
    const user = await this.findTechnicianOrThrow(id, { includeInactive: true });

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('E-mail já registado');
      }
    }

    const data: Prisma.UserUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.phoneCountryCode !== undefined && {
        phoneCountryCode: dto.phoneCountryCode,
      }),
      ...(dto.phoneNationalNumber !== undefined && {
        phoneNationalNumber: dto.phoneNationalNumber,
      }),
      ...(dto.startedAt !== undefined && {
        startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
      }),
      ...(dto.skills !== undefined && { skills: dto.skills }),
      ...(dto.scheduleLabel !== undefined && { scheduleLabel: dto.scheduleLabel }),
      ...(dto.workloadHours !== undefined && { workloadHours: dto.workloadHours }),
      ...(dto.available !== undefined && { available: dto.available }),
      ...(dto.active !== undefined && { active: dto.active }),
      ...(dto.password && { password: await bcrypt.hash(dto.password, 10) }),
    };

    const updated = await this.prisma.user.update({ where: { id }, data });

    if (dto.serviceIds !== undefined) {
      await this.catalogService.syncTechnicianServices(id, dto.serviceIds);
    }

    const withServices = await this.findTechnicianOrThrow(id, {
      includeInactive: true,
      includeServices: true,
    });
    const conflictIds = await findTechnicianIdsWithScheduleConflict(this.prisma);
    const stats = await this.getStatsForUser(updated.id, conflictIds);
    return mapTechnicianListItem(withServices, stats);
  }

  async deactivate(id: string) {
    await this.findTechnicianOrThrow(id, { includeInactive: true });
    const updated = await this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
    this.logger.log(`Technician deactivated: ${id}`);
    return { id: updated.id, active: updated.active };
  }

  private buildListWhere(
    dto: FindTechniciansDto,
    conflictIds: string[],
  ): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {
      role: Role.TECHNICIAN,
    };

    if (dto.active !== undefined) {
      where.active = dto.active;
    } else if (!dto.includeInactive) {
      where.active = true;
    }

    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    if (dto.available !== undefined) {
      where.available = dto.available;
    }

    if (dto.hasScheduleConflict === true) {
      where.id = { in: conflictIds.length ? conflictIds : ['__none__'] };
    } else if (dto.hasScheduleConflict === false) {
      where.id = { notIn: conflictIds };
    }

    return where;
  }

  private async getStatsForUser(userId: string, conflictIds: string[]) {
    const { start, end } = getCurrentMonthRange();
    const { start: dayStart, end: dayEnd } = getTodayBounds();
    const today = getTodayDateString();

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const [
      activeAppointmentsCount,
      completedCount,
      activeTasksToday,
      appointmentsTodayCount,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          userId,
          status: { in: ACTIVE_APPOINTMENT_STATUSES },
        },
      }),
      this.prisma.appointment.count({
        where: {
          userId,
          status: AppointmentStatus.COMPLETED,
          scheduledAt: { gte: start, lte: end },
        },
      }),
      this.prisma.task.findMany({
        where: {
          tecnico: { equals: user.name, mode: 'insensitive' },
          status: { in: ACTIVE_TASK_STATUSES },
          dataAgendada: today,
        },
        select: { duracaoHoras: true },
      }),
      this.prisma.appointment.count({
        where: {
          userId,
          status: { in: ACTIVE_APPOINTMENT_STATUSES },
          scheduledAt: { gte: dayStart, lte: dayEnd },
        },
      }),
    ]);

    const scheduledHoursToday = sumScheduledHours(
      activeTasksToday.map((task) => task.duracaoHoras),
      appointmentsTodayCount,
    );

    return buildStats(
      user,
      activeAppointmentsCount,
      completedCount,
      conflictIds.includes(userId),
      scheduledHoursToday,
    );
  }

  private async findTechnicianOrThrow(
    id: string,
    opts?: { includeInactive?: boolean; includeServices?: boolean },
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: Role.TECHNICIAN,
        ...(opts?.includeInactive ? {} : { active: true }),
      },
      include: opts?.includeServices
        ? {
            technicianServices: {
              include: { catalogService: { select: { id: true, code: true, name: true, serviceCategory: true, active: true } } },
            },
          }
        : undefined,
    });
    if (!user) {
      throw new NotFoundException('Técnico não encontrado');
    }
    return user;
  }

  private assertCanRead(id: string, requester: JwtUser) {
    if (requester.role === Role.ADMIN) return;
    if (requester.role === Role.TECHNICIAN && requester.id === id) return;
    throw new ForbiddenException('Acesso negado');
  }
}
