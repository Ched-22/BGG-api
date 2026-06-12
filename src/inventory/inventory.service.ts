import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryProductDto } from './dto/create-inventory-product.dto';
import { FindInventoryProductsDto } from './dto/find-inventory-products.dto';
import { UpdateInventoryProductDto } from './dto/update-inventory-product.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private normalizeSku(sku: string) {
    return sku.trim().toUpperCase();
  }

  async findAll(dto: FindInventoryProductsDto) {
    const where: Prisma.InventoryProductWhereInput = {};

    if (!dto.includeInactive) {
      where.active = true;
    }

    if (dto.category) {
      where.category = dto.category;
    }

    if (dto.search?.trim()) {
      const term = dto.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
      ];
    }

    const data = await this.prisma.inventoryProduct.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return { data, total: data.length };
  }

  async create(dto: CreateInventoryProductDto) {
    const sku = this.normalizeSku(dto.sku);
    const existing = await this.prisma.inventoryProduct.findUnique({
      where: { sku },
    });
    if (existing) {
      throw new ConflictException('SKU já cadastrado');
    }

    return this.prisma.inventoryProduct.create({
      data: {
        sku,
        name: dto.name.trim(),
        category: dto.category.trim(),
        unit: dto.unit.trim(),
        currentQuantity: dto.currentQuantity,
        maxCapacity: dto.maxCapacity,
        supplier: dto.supplier?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateInventoryProductDto) {
    const product = await this.findActiveOrThrow(id);

    if (dto.sku) {
      const sku = this.normalizeSku(dto.sku);
      const duplicate = await this.prisma.inventoryProduct.findFirst({
        where: { sku, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException('SKU já cadastrado');
      }
    }

    return this.prisma.inventoryProduct.update({
      where: { id: product.id },
      data: {
        ...(dto.sku != null ? { sku: this.normalizeSku(dto.sku) } : {}),
        ...(dto.name != null ? { name: dto.name.trim() } : {}),
        ...(dto.category != null ? { category: dto.category.trim() } : {}),
        ...(dto.unit != null ? { unit: dto.unit.trim() } : {}),
        ...(dto.currentQuantity != null
          ? { currentQuantity: dto.currentQuantity }
          : {}),
        ...(dto.maxCapacity != null ? { maxCapacity: dto.maxCapacity } : {}),
        ...(dto.supplier !== undefined
          ? { supplier: dto.supplier?.trim() || null }
          : {}),
      },
    });
  }

  async deactivate(id: string) {
    await this.findActiveOrThrow(id);
    return this.prisma.inventoryProduct.update({
      where: { id },
      data: { active: false },
    });
  }

  private async findActiveOrThrow(id: string) {
    const product = await this.prisma.inventoryProduct.findUnique({
      where: { id },
    });
    if (!product || !product.active) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }
}
