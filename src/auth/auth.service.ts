import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

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

  async createInitialAdmin() {
    const exists = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (exists) return { message: 'Admin já existe' };

    const hash = await bcrypt.hash('admin123', 10);
    const user = await this.prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@bgggarage.com',
        password: hash,
        role: 'ADMIN',
      },
    });

    return { message: 'Admin criado', email: user.email, password: 'admin123' };
  }
}