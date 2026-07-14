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
import { createHash, randomBytes } from 'crypto';
import { parseLegacyPhone } from '../common/phone-parse';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  buildPasswordResetEmailBodies,
  buildPasswordResetEmailSubject,
} from './password-reset-email';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mailService: MailService,
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
    const parsedPhone = dto.phone ? parseLegacyPhone(dto.phone) : null;
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        password: hash,
        phoneCountryCode: parsedPhone?.countryCode || null,
        phoneNationalNumber: parsedPhone?.nationalNumber || null,
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

  async requestPasswordReset(dto: ForgotPasswordDto) {
    const message =
      'Si existe una cuenta asociada a este correo, le enviaremos instrucciones para restablecer la contraseña.';
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (
      !user ||
      !user.password ||
      !user.active ||
      (user.role !== Role.ADMIN && user.role !== Role.TECHNICIAN)
    ) {
      return { message };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const baseUrl =
      dto.client === 'mobile'
        ? process.env.MOBILE_APP_URL || 'http://localhost:5174'
        : process.env.ADMIN_APP_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/?token=${token}`;

    this.logger.log(`Password reset link (${dto.client}) for ${email}: ${resetUrl}`);

    try {
      const { text, html } = buildPasswordResetEmailBodies(resetUrl);
      await this.mailService.sendMail({
        to: email,
        subject: buildPasswordResetEmailSubject(),
        text,
        html,
      });
      this.logger.log(`Password reset e-mail sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset e-mail to ${email}: ${(error as Error).message}`,
      );
    }

    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.PASSWORD_RESET_DEBUG === 'true'
    ) {
      return { message, debugResetUrl: resetUrl };
    }

    return { message };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Enlace no válido o caducado');
    }

    if (!record.user.active) {
      throw new BadRequestException('Cuenta inactiva');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Contraseña restablecida correctamente' };
  }

  private buildAuthResponse(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

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
