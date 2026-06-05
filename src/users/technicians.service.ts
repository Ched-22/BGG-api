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
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { FindTechniciansDto } from './dto/find-technicians.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import {
  ACTIVE_APPOINTMENT_STATUSES,
  getCurrentMonthRange,
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

  constructor(private prisma: PrismaService) {}

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
    });

    const conflictIds = await findTechnicianIdsWithScheduleConflict(this.prisma);
    const stats = await this.getStatsForUser(user.id, conflictIds);

    const appointments = await this.prisma.appointment.findMany({
      where: { userId: id },
      include: { vehicle: true },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });

    return mapTechnicianDetail({ ...user, appointments }, stats);
  }

  async findMe(requester: JwtUser) {
    return this.findOne(requester.id, requester);
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
        phone: dto.phone,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        skills: dto.skills ?? [],
        scheduleLabel: dto.scheduleLabel,
        workloadHours: dto.workloadHours ?? 0,
        available: dto.available ?? true,
      },
    });

    this.logger.log(`Technician created: ${user.id}`);
    const conflictIds = await findTechnicianIdsWithScheduleConflict(this.prisma);
    const stats = await this.getStatsForUser(user.id, conflictIds);
    return mapTechnicianListItem(user, stats);
  }

  async update(id: string, dto: UpdateTechnicianDto) {
    const user = await this.findTechnicianOrThrow(id);

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
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.startedAt !== undefined && {
        startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
      }),
      ...(dto.skills !== undefined && { skills: dto.skills }),
      ...(dto.scheduleLabel !== undefined && { scheduleLabel: dto.scheduleLabel }),
      ...(dto.workloadHours !== undefined && { workloadHours: dto.workloadHours }),
      ...(dto.available !== undefined && { available: dto.available }),
      ...(dto.password && { password: await bcrypt.hash(dto.password, 10) }),
    };

    const updated = await this.prisma.user.update({ where: { id }, data });
    const conflictIds = await findTechnicianIdsWithScheduleConflict(this.prisma);
    const stats = await this.getStatsForUser(updated.id, conflictIds);
    return mapTechnicianListItem(updated, stats);
  }

  async deactivate(id: string) {
    await this.findTechnicianOrThrow(id);
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
      ...(dto.includeInactive ? {} : { active: true }),
    };

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

    const [activeAppointmentsCount, completedCount] = await Promise.all([
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
    ]);

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return buildStats(
      user,
      activeAppointmentsCount,
      completedCount,
      conflictIds.includes(userId),
    );
  }

  private async findTechnicianOrThrow(
    id: string,
    opts?: { includeInactive?: boolean },
  ): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: Role.TECHNICIAN,
        ...(opts?.includeInactive ? {} : { active: true }),
      },
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
