import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { actorFromUser, TaskLogActor } from '../tasks/task-log';
import { CreateInventoryProductDto } from './dto/create-inventory-product.dto';
import { FindInventoryHistoryDto } from './dto/find-inventory-history.dto';
import { FindInventoryProductsDto } from './dto/find-inventory-products.dto';
import { UpdateInventoryProductDto } from './dto/update-inventory-product.dto';
import {
  appendMovement,
  movementTypeForQuantityChange,
} from './inventory-movement';

type InventoryActor = TaskLogActor;

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private normalizeSku(sku: string) {
    return sku.trim().toUpperCase();
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
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

  async findHistory(productId: string, dto: FindInventoryHistoryDto) {
    await this.findProductOrThrow(productId);

    const limit = dto.limit ?? 50;
    const offset = dto.offset ?? 0;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.findMany({
        where: { productId },
        orderBy: { occurredAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.inventoryMovement.count({ where: { productId } }),
    ]);

    return { data, total, limit, offset };
  }

  async create(dto: CreateInventoryProductDto, actor: InventoryActor) {
    const sku = this.normalizeSku(dto.sku);
    const existing = await this.prisma.inventoryProduct.findUnique({
      where: { sku },
    });
    if (existing) {
      throw new ConflictException('SKU já cadastrado');
    }

    const unitCost = dto.unitCost ?? 0;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.inventoryProduct.create({
        data: {
          sku,
          name: dto.name.trim(),
          category: dto.category.trim(),
          unit: dto.unit.trim(),
          currentQuantity: dto.currentQuantity,
          maxCapacity: dto.maxCapacity,
          unitCost,
          supplier: dto.supplier?.trim() || null,
        },
      });

      await appendMovement(tx, {
        productId: product.id,
        type: InventoryMovementType.CREATED,
        quantityBefore: 0,
        quantityAfter: product.currentQuantity,
        unitCostSnapshot: unitCost,
        actor,
        occurredAt: product.createdAt,
      });

      return product;
    });
  }

  async update(
    id: string,
    dto: UpdateInventoryProductDto,
    actor: InventoryActor,
  ) {
    const product = await this.findActiveOrThrow(id);
    const { adjustmentNote, ...productPatch } = dto;

    if (productPatch.sku) {
      const sku = this.normalizeSku(productPatch.sku);
      const duplicate = await this.prisma.inventoryProduct.findFirst({
        where: { sku, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException('SKU já cadastrado');
      }
    }

    if (
      productPatch.currentQuantity != null &&
      (!Number.isInteger(productPatch.currentQuantity) ||
        productPatch.currentQuantity < 0)
    ) {
      throw new BadRequestException('currentQuantity inválida');
    }

    const nextUnitCost = productPatch.unitCost ?? product.unitCost;
    const nextQuantity =
      productPatch.currentQuantity ?? product.currentQuantity;
    const movementType = movementTypeForQuantityChange(
      product.currentQuantity,
      nextQuantity,
    );
    const quantityConsumed =
      nextQuantity < product.currentQuantity
        ? product.currentQuantity - nextQuantity
        : 0;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryProduct.update({
        where: { id: product.id },
        data: {
          ...(productPatch.sku != null
            ? { sku: this.normalizeSku(productPatch.sku) }
            : {}),
          ...(productPatch.name != null
            ? { name: productPatch.name.trim() }
            : {}),
          ...(productPatch.category != null
            ? { category: productPatch.category.trim() }
            : {}),
          ...(productPatch.unit != null
            ? { unit: productPatch.unit.trim() }
            : {}),
          ...(productPatch.currentQuantity != null
            ? { currentQuantity: productPatch.currentQuantity }
            : {}),
          ...(productPatch.maxCapacity != null
            ? { maxCapacity: productPatch.maxCapacity }
            : {}),
          ...(productPatch.unitCost != null
            ? { unitCost: productPatch.unitCost }
            : {}),
          ...(productPatch.supplier !== undefined
            ? { supplier: productPatch.supplier?.trim() || null }
            : {}),
        },
      });

      if (movementType) {
        await appendMovement(tx, {
          productId: product.id,
          type: movementType,
          quantityBefore: product.currentQuantity,
          quantityAfter: nextQuantity,
          unitCostSnapshot: nextUnitCost,
          note: adjustmentNote,
          actor,
        });
      }

      if (quantityConsumed > 0) {
        const unitCostSnapshot = nextUnitCost;
        await tx.inventoryConsumption.create({
          data: {
            productId: product.id,
            quantityConsumed,
            unitCostSnapshot,
            totalCost: this.roundMoney(quantityConsumed * unitCostSnapshot),
          },
        });
      }

      return updated;
    });
  }

  async deactivate(id: string, actor: InventoryActor) {
    const product = await this.findActiveOrThrow(id);

    return this.prisma.$transaction(async (tx) => {
      await appendMovement(tx, {
        productId: product.id,
        type: InventoryMovementType.DEACTIVATED,
        quantityBefore: product.currentQuantity,
        quantityAfter: product.currentQuantity,
        unitCostSnapshot: product.unitCost,
        actor,
      });

      return tx.inventoryProduct.update({
        where: { id: product.id },
        data: { active: false },
      });
    });
  }

  private async findProductOrThrow(id: string) {
    const product = await this.prisma.inventoryProduct.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  private async findActiveOrThrow(id: string) {
    const product = await this.findProductOrThrow(id);
    if (!product.active) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  /** @internal for tests */
  static actorFromUser = actorFromUser;
}
