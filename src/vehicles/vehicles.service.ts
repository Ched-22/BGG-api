import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  normalizePlate,
  validatePlate,
  plateValidationMessage,
  resolvePlateCountry,
} from '../common/plate-utils';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { FindVehiclesDto } from './dto/find-vehicles.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { mapVehicleForClient, mapVehicleListItem } from './vehicles.mapper';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVehicleDto) {
    const plateCountry = resolvePlateCountry(dto.plateCountry);
    const plate = this.assertValidPlate(dto.plate, plateCountry);
    await this.assertClientExists(dto.clientId);

    try {
      const vehicle = await this.prisma.vehicle.create({
        data: { ...dto, plate, plateCountry, year: Number(dto.year) },
        include: { client: true },
      });
      return mapVehicleListItem(vehicle);
    } catch (err) {
      this.handleUniquePlateError(err);
      throw err;
    }
  }

  async findAll(dto: FindVehiclesDto) {
    const where = this.buildListWhere(dto);
    const skip = (dto.page - 1) * dto.limit;

    const [total, vehicles] = await Promise.all([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.findMany({
        where,
        include: { client: true },
        orderBy: { plate: 'asc' },
        skip,
        take: dto.limit,
      }),
    ]);

    return {
      data: vehicles.map(mapVehicleListItem),
      page: dto.page,
      limit: dto.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / dto.limit)),
    };
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: { client: true, appointments: true },
    });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');
    return mapVehicleListItem(vehicle);
  }

  async findByClient(clientId: string) {
    await this.assertClientExists(clientId);
    const vehicles = await this.prisma.vehicle.findMany({
      where: { clientId },
      orderBy: { plate: 'asc' },
    });
    return vehicles.map(mapVehicleForClient);
  }

  async update(id: string, dto: UpdateVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Veículo não encontrado');

    const data: Prisma.VehicleUpdateInput = {};
    if (dto.brand != null) data.brand = dto.brand;
    if (dto.model != null) data.model = dto.model;
    if (dto.year != null) data.year = Number(dto.year);
    if (dto.color !== undefined) data.color = dto.color?.trim() || null;
    if (dto.clientId != null) {
      await this.assertClientExists(dto.clientId);
      data.client = { connect: { id: dto.clientId } };
    }
    if (dto.plate != null) {
      const plateCountry = resolvePlateCountry(
        dto.plateCountry ?? existing.plateCountry,
      );
      const plate = this.assertValidPlate(dto.plate, plateCountry);
      if (plate !== existing.plate) {
        const conflict = await this.prisma.vehicle.findUnique({
          where: { plate },
        });
        if (conflict && conflict.id !== id) {
          throw new ConflictException(
            'Placa já cadastrada para outro cliente',
          );
        }
      }
      data.plate = plate;
      data.plateCountry = plateCountry;
    } else if (dto.plateCountry != null) {
      data.plateCountry = resolvePlateCountry(dto.plateCountry);
    }

    try {
      const vehicle = await this.prisma.vehicle.update({
        where: { id },
        data,
        include: { client: true },
      });
      return mapVehicleListItem(vehicle);
    } catch (err) {
      this.handleUniquePlateError(err);
      throw err;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.vehicle.delete({ where: { id } });
    return { ok: true };
  }

  private buildListWhere(dto: FindVehiclesDto): Prisma.VehicleWhereInput {
    const plateTerm = dto.plate?.trim() || dto.search?.trim();
    if (!plateTerm) {
      if (dto.search?.trim()) {
        const term = dto.search.trim();
        return {
          OR: [
            { brand: { contains: term, mode: 'insensitive' } },
            { model: { contains: term, mode: 'insensitive' } },
          ],
        };
      }
      return {};
    }

    const normalized = normalizePlate(plateTerm);
    if (!normalized) return {};

    return {
      plate: { contains: normalized, mode: 'insensitive' },
    };
  }

  private assertValidPlate(plate: string, country?: string | null): string {
    const plateCountry = resolvePlateCountry(country);
    if (!validatePlate(plate, plateCountry)) {
      throw new BadRequestException(plateValidationMessage(plateCountry));
    }
    return normalizePlate(plate, plateCountry);
  }

  private async assertClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  private handleUniquePlateError(err: unknown): void {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw new ConflictException('Placa já cadastrada para outro cliente');
    }
  }
}
