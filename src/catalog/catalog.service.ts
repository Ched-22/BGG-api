import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CatalogService as CatalogServiceModel,
  CatalogServicePrice,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapCatalogServiceDetailDto,
  mapCatalogServiceDto,
} from './catalog.mapper';
import {
  CreateCatalogServiceDto,
  FindCatalogServicesDto,
  PublishCatalogServicePricesDto,
  UpdateCatalogServiceDto,
} from './dto/catalog-service.dto';
import {
  pickUnitPrice,
  ServiceSnapshot,
  sumSnapshotSubtotal,
} from './service-snapshots.util';

@Injectable()
export class ServiceCatalogService {
  constructor(private prisma: PrismaService) {}

  private normalizeCode(code: string) {
    return code.trim().toLowerCase();
  }

  private includeCurrentPrice = {
    prices: {
      where: { effectiveTo: null },
      take: 1,
    },
  } satisfies Prisma.CatalogServiceInclude;

  async findAll(
    dto: FindCatalogServicesDto,
    viewer?: { id: string; role: Role },
  ) {
    const where: Prisma.CatalogServiceWhereInput = {};
    if (!dto.includeInactive) {
      where.active = true;
    }
    if (viewer?.role === Role.TECHNICIAN) {
      where.technicians = { some: { userId: viewer.id } };
    }

    const rows = await this.prisma.catalogService.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: this.includeCurrentPrice,
    });

    const data = rows.map((row) => mapCatalogServiceDto(row, row.prices[0]));
    return { data, total: data.length };
  }

  async findOne(id: string) {
    const service = await this.prisma.catalogService.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }

    const priceHistory = await this.prisma.catalogServicePrice.findMany({
      where: { catalogServiceId: id },
      orderBy: { effectiveFrom: 'desc' },
    });

    return mapCatalogServiceDetailDto(service, priceHistory);
  }

  async create(dto: CreateCatalogServiceDto) {
    const code = this.normalizeCode(dto.code);
    const existing = await this.prisma.catalogService.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException('Código de serviço já cadastrado');
    }

    const service = await this.prisma.catalogService.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        durationMinutes: dto.durationMinutes,
        serviceCategory: dto.serviceCategory,
        prices: {
          create: {
            priceSmall: dto.priceSmall,
            priceMedium: dto.priceMedium,
            priceLarge: dto.priceLarge,
          },
        },
      },
      include: this.includeCurrentPrice,
    });

    return mapCatalogServiceDto(service, service.prices[0]);
  }

  async update(id: string, dto: UpdateCatalogServiceDto) {
    await this.findServiceOrThrow(id);

    const updated = await this.prisma.catalogService.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.durationMinutes !== undefined
          ? { durationMinutes: dto.durationMinutes }
          : {}),
        ...(dto.serviceCategory !== undefined
          ? { serviceCategory: dto.serviceCategory }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      include: this.includeCurrentPrice,
    });

    return mapCatalogServiceDto(updated, updated.prices[0]);
  }

  async publishNewPrices(id: string, dto: PublishCatalogServicePricesDto) {
    await this.findServiceOrThrow(id);

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.catalogServicePrice.findFirst({
        where: { catalogServiceId: id, effectiveTo: null },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (current) {
        await tx.catalogServicePrice.update({
          where: { id: current.id },
          data: { effectiveTo: now },
        });
      }

      await tx.catalogServicePrice.create({
        data: {
          catalogServiceId: id,
          priceSmall: dto.priceSmall,
          priceMedium: dto.priceMedium,
          priceLarge: dto.priceLarge,
          effectiveFrom: now,
        },
      });

      await tx.catalogService.update({
        where: { id },
        data: { updatedAt: now },
      });
    });

    return this.findOne(id);
  }

  async deactivate(id: string) {
    const service = await this.findServiceOrThrow(id);
    if (!service.active) {
      throw new NotFoundException('Serviço não encontrado');
    }

    const updated = await this.prisma.catalogService.update({
      where: { id },
      data: { active: false },
      include: this.includeCurrentPrice,
    });

    return mapCatalogServiceDto(updated, updated.prices[0]);
  }

  async buildSnapshots(
    serviceCodes: string[],
    vehicleSize?: string | null,
    options?: { useFirstPriceVersion?: boolean },
  ): Promise<ServiceSnapshot[]> {
    const codes = [...new Set(serviceCodes.map((c) => this.normalizeCode(c)))];
    if (!codes.length) return [];

    const services = await this.prisma.catalogService.findMany({
      where: { code: { in: codes } },
      include: {
        prices: options?.useFirstPriceVersion
          ? { orderBy: { effectiveFrom: 'asc' }, take: 1 }
          : { where: { effectiveTo: null }, take: 1 },
      },
    });

    const byCode = new Map(services.map((s) => [s.code, s]));
    const missing = codes.filter((code) => !byCode.has(code));
    if (missing.length) {
      throw new BadRequestException(
        `Serviços desconhecidos ou inactivos: ${missing.join(', ')}`,
      );
    }

    return codes.map((code) => {
      const service = byCode.get(code)!;
      const price = service.prices[0];
      if (!price) {
        throw new BadRequestException(`Serviço sem preço vigente: ${code}`);
      }
      return this.toSnapshot(service, price, vehicleSize);
    });
  }

  async syncTechnicianServices(userId: string, serviceIds: string[]) {
    const uniqueIds = [...new Set(serviceIds)];
    if (uniqueIds.length) {
      const services = await this.prisma.catalogService.findMany({
        where: { id: { in: uniqueIds }, active: true },
      });
      if (services.length !== uniqueIds.length) {
        throw new BadRequestException('Um ou mais serviços são inválidos ou inactivos');
      }
    }

    await this.prisma.$transaction([
      this.prisma.technicianService.deleteMany({ where: { userId } }),
      ...(uniqueIds.length
        ? [
            this.prisma.technicianService.createMany({
              data: uniqueIds.map((catalogServiceId) => ({ userId, catalogServiceId })),
            }),
          ]
        : []),
    ]);
  }

  async getTechnicianServiceCodes(userId: string): Promise<string[]> {
    const rows = await this.prisma.technicianService.findMany({
      where: { userId },
      include: { catalogService: { select: { code: true } } },
    });
    return rows.map((row) => row.catalogService.code);
  }

  async getTechnicianServices(userId: string) {
    const rows = await this.prisma.technicianService.findMany({
      where: { userId },
      include: {
        catalogService: { include: this.includeCurrentPrice },
      },
      orderBy: { catalogService: { createdAt: 'asc' } },
    });
    return rows.map((row) =>
      mapCatalogServiceDto(row.catalogService, row.catalogService.prices[0]),
    );
  }

  computeTotalFromSnapshots(
    snapshots: ServiceSnapshot[],
    discount = 0,
  ) {
    const subtotal = sumSnapshotSubtotal(snapshots);
    return subtotal - Number(discount || 0);
  }

  private toSnapshot(
    service: { id: string; code: string; name: string; durationMinutes: number },
    price: CatalogServicePrice,
    vehicleSize?: string | null,
  ): ServiceSnapshot {
    return {
      serviceId: service.id,
      code: service.code,
      name: service.name,
      unitPrice: pickUnitPrice(price, vehicleSize),
      priceVersionId: price.id,
      durationMinutes: service.durationMinutes,
    };
  }

  private async findServiceOrThrow(id: string) {
    const service = await this.prisma.catalogService.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }
    return service;
  }
}
