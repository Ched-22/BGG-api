import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Quote, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

type AuthUser = { id: string; email: string; role: Role };

const quoteInclude = {
  createdBy: { select: { id: true, name: true } },
};

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateQuoteDto, user: AuthUser) {
    return this.prisma.quote.create({
      data: {
        ...(dto as any),
        createdById: user.id,
      },
      include: quoteInclude,
    });
  }

  async findAll(status: string | undefined, user: AuthUser) {
    const where = {
      ...(status ? { status: status as any } : {}),
      ...this.scopeForUser(user),
    };
    return this.prisma.quote.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: quoteInclude,
    });
  }

  async findOne(id: string, user: AuthUser) {
    const quote = await this.getQuoteOrThrow(id);
    this.assertCanAccess(quote, user);
    return this.prisma.quote.findUnique({
      where: { id },
      include: quoteInclude,
    });
  }

  async update(id: string, dto: UpdateQuoteDto, user: AuthUser) {
    const quote = await this.getQuoteOrThrow(id);
    this.assertCanAccess(quote, user);
    return this.prisma.quote.update({
      where: { id },
      data: dto as any,
      include: quoteInclude,
    });
  }

  async submit(id: string, user: AuthUser) {
    const quote = await this.getQuoteOrThrow(id);
    this.assertCanAccess(quote, user);
    return this.prisma.quote.update({
      where: { id },
      data: { status: 'PENDING', submittedAt: new Date() },
      include: quoteInclude,
    });
  }

  async approve(id: string) {
    await this.getQuoteOrThrow(id);
    return this.prisma.quote.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
      include: quoteInclude,
    });
  }

  async remove(id: string) {
    await this.getQuoteOrThrow(id);
    return this.prisma.quote.delete({ where: { id } });
  }

  private scopeForUser(user: AuthUser) {
    if (user.role === Role.TECHNICIAN) {
      return { createdById: user.id };
    }
    return {};
  }

  private async getQuoteOrThrow(id: string): Promise<Quote> {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Orçamento não encontrado');
    return quote;
  }

  private assertCanAccess(quote: Quote, user: AuthUser) {
    if (user.role !== Role.TECHNICIAN) return;
    if (quote.createdById !== user.id) {
      throw new ForbiddenException('Sem permissão para aceder a este orçamento');
    }
  }
}
