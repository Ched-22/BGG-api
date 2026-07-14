import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';

function generateTempPassword(): string {
  return randomBytes(9).toString('base64url');
}

@Injectable()
export class AdminsService {
  private readonly logger = new Logger(AdminsService.name);

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAdminDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (existing.role === Role.ADMIN) {
        throw new ConflictException('Este e-mail já é administrador');
      }

      const promoted = await this.prisma.user.update({
        where: { id: existing.id },
        data: { role: Role.ADMIN, active: true },
      });

      this.logger.log(`Usuário promovido a admin: ${email}`);
      return {
        action: 'promoted' as const,
        id: promoted.id,
        name: promoted.name,
        email: promoted.email,
        role: promoted.role,
      };
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const created = await this.prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role: Role.ADMIN,
        active: true,
      },
    });

    this.logger.log(`Admin criado: ${email}`);
    return {
      action: 'created' as const,
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      tempPassword,
    };
  }
}
