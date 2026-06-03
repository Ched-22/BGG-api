import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateQuoteDto) {
    return this.prisma.quote.create({ data: dto as any });
  }

  async findAll(status?: string) {
    return this.prisma.quote.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Orçamento não encontrado');
    return quote;
  }

  async update(id: string, dto: UpdateQuoteDto) {
    await this.findOne(id);
    return this.prisma.quote.update({ where: { id }, data: dto as any });
  }

  async submit(id: string) {
    await this.findOne(id);
    return this.prisma.quote.update({
      where: { id },
      data: { status: 'PENDING', submittedAt: new Date() },
    });
  }

  async approve(id: string) {
    await this.findOne(id);
    return this.prisma.quote.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.quote.delete({ where: { id } });
  }
}