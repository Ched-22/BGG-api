import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return this.buildAuthResponse(user);
  }

  async register(dto: RegisterDto) {
    if (dto.role && dto.role !== Role.TECHNICIAN) {
      this.logger.warn(`Register attempt with role=${dto.role} ignored`);
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        password: hash,
        phone: dto.phone?.trim() || null,
        role: Role.TECHNICIAN,
        active: true,
        available: true,
      },
    });

    return this.buildAuthResponse(user);
  }

  async googleAuth(dto: GoogleAuthDto) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('Google OAuth não configurado');
    }

    const client = new OAuth2Client(clientId);
    let payload: {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };

    try {
      const ticket = await client.verifyIdToken({
        idToken: dto.idToken,
        audience: clientId,
      });
      payload = ticket.getPayload() ?? {};
    } catch (error) {
      this.logger.warn('Google token verification failed');
      throw new UnauthorizedException('Token Google inválido');
    }

    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Token Google inválido');
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException('E-mail Google não verificado');
    }

    const email = payload.email.trim().toLowerCase();
    const googleId = payload.sub;
    const name = payload.name?.trim() || email.split('@')[0];

    const byGoogle = await this.prisma.user.findUnique({ where: { googleId } });
    if (byGoogle) {
      return this.buildAuthResponse(byGoogle);
    }

    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      if (byEmail.googleId && byEmail.googleId !== googleId) {
        throw new ConflictException(
          'Conta Google já vinculada a outro e-mail',
        );
      }

      const linked = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId },
      });
      return this.buildAuthResponse(linked);
    }

    const created = await this.prisma.user.create({
      data: {
        name,
        email,
        googleId,
        password: null,
        role: Role.TECHNICIAN,
        active: true,
        available: true,
      },
    });

    return this.buildAuthResponse(created);
  }

  async createInitialAdmin() {
    const exists = await this.prisma.user.findFirst({
      where: { role: Role.ADMIN },
    });

    if (exists) return { message: 'Admin já existe' };

    const hash = await bcrypt.hash('admin123', 10);
    const user = await this.prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@bgggarage.com',
        password: hash,
        role: Role.ADMIN,
      },
    });

    return { message: 'Admin criado', email: user.email, password: 'admin123' };
  }

  private buildAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      access_token: this.jwt.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
