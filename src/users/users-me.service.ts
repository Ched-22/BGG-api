import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  normalizePhonePair,
  validatePhonePair,
} from '../common/phone-validate';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { mapAdminProfile, mapTechnicianProfile } from './profile.mapper';
import { TechniciansService } from './technicians.service';

type JwtUser = { id: string; email: string; role: Role };

@Injectable()
export class UsersMeService {
  constructor(
    private prisma: PrismaService,
    private techniciansService: TechniciansService,
  ) {}

  async getMe(requester: JwtUser) {
    const user = await this.findActiveUserOrThrow(requester.id);
    return this.buildProfileResponse(user);
  }

  async updateMe(requester: JwtUser, dto: UpdateMyProfileDto) {
    const user = await this.findActiveUserOrThrow(requester.id);

    if (dto.skills !== undefined && user.role !== Role.TECHNICIAN) {
      throw new BadRequestException('Campo skills não permitido para este perfil');
    }

    if (dto.email && dto.email.trim().toLowerCase() !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email.trim().toLowerCase() },
      });
      if (existing) {
        throw new ConflictException('E-mail já registado');
      }
    }

    const hasPhoneCountry = dto.phoneCountryCode !== undefined;
    const hasPhoneNational = dto.phoneNationalNumber !== undefined;
    if (hasPhoneCountry !== hasPhoneNational) {
      throw new BadRequestException(
        'Informe código do país e número de telefone juntos',
      );
    }

    if (hasPhoneCountry && hasPhoneNational) {
      const phoneErr = validatePhonePair(
        dto.phoneCountryCode!,
        dto.phoneNationalNumber!,
      );
      if (phoneErr) throw new BadRequestException(phoneErr);
    }

    if (dto.password) {
      if (!user.password) {
        throw new BadRequestException(
          'Conta Google não pode definir senha por este fluxo',
        );
      }
      if (!dto.currentPassword) {
        throw new BadRequestException('Senha atual é obrigatória');
      }
      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid) {
        throw new BadRequestException('Senha atual incorreta');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (hasPhoneCountry && hasPhoneNational) {
      const normalized = normalizePhonePair(
        dto.phoneCountryCode!,
        dto.phoneNationalNumber!,
      );
      data.phoneCountryCode = normalized.phoneCountryCode || null;
      data.phoneNationalNumber = normalized.phoneNationalNumber || null;
    }
    if (dto.skills !== undefined && user.role === Role.TECHNICIAN) {
      data.skills = dto.skills;
    }
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data,
    });

    return this.buildProfileResponse(updated);
  }

  private async buildProfileResponse(user: {
    id: string;
    role: Role;
  }) {
    const fresh = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh) throw new NotFoundException('Usuário não encontrado');

    if (fresh.role === Role.ADMIN) {
      return mapAdminProfile(fresh);
    }

    if (fresh.role === Role.TECHNICIAN) {
      const technician = await this.prisma.user.findUnique({
        where: { id: fresh.id },
        include: {
          technicianServices: {
            include: {
              catalogService: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  serviceCategory: true,
                  active: true,
                },
              },
            },
          },
        },
      });
      if (!technician) throw new NotFoundException('Usuário não encontrado');

      const stats = await this.techniciansService.getStatsForTechnician(technician.id);
      const upcoming = await this.prisma.appointment.findMany({
        where: {
          userId: technician.id,
          status: { not: AppointmentStatus.CANCELLED },
        },
        include: { vehicle: true },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      });
      return mapTechnicianProfile(technician, stats, upcoming);
    }

    throw new ForbiddenException('Perfil não disponível');
  }

  private async findActiveUserOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (!user.active) throw new ForbiddenException('Conta inativa');
    return user;
  }
}
