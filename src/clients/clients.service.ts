import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizePreferredLanguage } from '../common/client-preferred-language';
import { PrismaService } from '../prisma/prisma.service';
import { ClientDenormalizedSyncService } from './client-denormalized-sync.service';
import { CreateClientDto } from './dto/create-client.dto';
import { FindClientsDto } from './dto/find-clients.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  private readonly denormalizedSync = new ClientDenormalizedSyncService();

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateClientDto) {
    const { preferredLanguage, ...rest } = dto;
    return this.prisma.client.create({
      data: {
        ...rest,
        preferredLanguage: normalizePreferredLanguage(preferredLanguage),
      },
    });
  }

  private buildSearchWhere(search?: string): Prisma.ClientWhereInput | undefined {
    const query = search?.trim();
    if (!query) return undefined;

    return {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { phoneNationalNumber: { contains: query.replace(/\D/g, '') } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    };
  }

  private buildListWhere(dto: FindClientsDto): Prisma.ClientWhereInput {
    const where: Prisma.ClientWhereInput = {};
    const searchWhere = this.buildSearchWhere(dto.search);
    if (searchWhere) Object.assign(where, searchWhere);

    const status = dto.status?.trim();
    if (status && status !== 'Todos') {
      where.status = status;
    }

    return where;
  }

  private async getStatusCounts(search?: string) {
    const searchWhere = this.buildSearchWhere(search);
    const baseWhere: Prisma.ClientWhereInput = searchWhere ? { ...searchWhere } : {};

    const [todos, ativo, vip, inativo] = await Promise.all([
      this.prisma.client.count({ where: baseWhere }),
      this.prisma.client.count({ where: { ...baseWhere, status: 'Ativo' } }),
      this.prisma.client.count({ where: { ...baseWhere, status: 'VIP' } }),
      this.prisma.client.count({ where: { ...baseWhere, status: 'Inativo' } }),
    ]);

    return {
      Todos: todos,
      Ativo: ativo,
      VIP: vip,
      Inativo: inativo,
    };
  }

  async findAll(dto: FindClientsDto) {
    const where = this.buildListWhere(dto);
    const skip = (dto.page - 1) * dto.limit;

    const [total, rows, statusCounts] = await Promise.all([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where,
        include: { vehicles: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: dto.limit,
      }),
      this.getStatusCounts(dto.search),
    ]);

    return {
      data: rows,
      page: dto.page,
      limit: dto.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / dto.limit)),
      statusCounts,
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { vehicles: true },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    const before = await this.prisma.client.findUnique({
      where: { id },
      include: { vehicles: true },
    });
    if (!before) throw new NotFoundException('Cliente não encontrado');

    return this.prisma.$transaction(async (tx) => {
      const { preferredLanguage, ...rest } = dto;
      const data: Prisma.ClientUpdateInput = { ...rest };
      if (preferredLanguage !== undefined) {
        data.preferredLanguage = normalizePreferredLanguage(preferredLanguage);
      }
      const updated = await tx.client.update({ where: { id }, data });
      await this.denormalizedSync.propagate(tx, before, updated);
      return updated;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.client.delete({ where: { id } });
  }

  async search(query: string) {
    const result = await this.findAll({ page: 1, limit: 50, search: query });
    return result.data;
  }
}
