import { InventoryMovementType } from '@prisma/client';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  const actor = { id: 'admin-1', name: 'Pedro Admin', role: 'ADMIN' as const };

  const product = {
    id: 'prod-1',
    sku: 'SKU-1',
    name: 'Produto teste',
    category: 'Químicos',
    unit: 'un',
    currentQuantity: 50,
    maxCapacity: 200,
    unitCost: 10,
    supplier: null,
    active: true,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    updatedAt: new Date('2026-06-01T10:00:00.000Z'),
  };

  let tx: {
    inventoryProduct: {
      create: jest.Mock;
      update: jest.Mock;
    };
    inventoryMovement: { create: jest.Mock };
    inventoryConsumption: { create: jest.Mock };
  };

  const prisma = {
    inventoryProduct: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inventoryMovement: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    inventoryConsumption: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  let service: InventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = {
      inventoryProduct: {
        create: jest.fn(),
        update: jest.fn(),
      },
      inventoryMovement: { create: jest.fn().mockResolvedValue({ id: 'mov-1' }) },
      inventoryConsumption: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return arg(tx);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
    service = new InventoryService(prisma as never);
  });

  it('create appends CREATED movement', async () => {
    prisma.inventoryProduct.findUnique.mockResolvedValue(null);
    tx.inventoryProduct.create.mockResolvedValue(product);

    const result = await service.create(
      {
        sku: 'SKU-1',
        name: 'Produto teste',
        category: 'Químicos',
        unit: 'un',
        currentQuantity: 50,
        maxCapacity: 200,
        unitCost: 10,
      },
      actor,
    );

    expect(result).toEqual(product);
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: InventoryMovementType.CREATED,
          quantityBefore: 0,
          quantityAfter: 50,
          quantityDelta: 50,
          actorName: 'Pedro Admin',
        }),
      }),
    );
  });

  it('update with higher quantity appends ADJUSTMENT_IN', async () => {
    prisma.inventoryProduct.findUnique.mockResolvedValue(product);
    tx.inventoryProduct.update.mockResolvedValue({
      ...product,
      currentQuantity: 70,
    });

    await service.update(
      product.id,
      { currentQuantity: 70, adjustmentNote: 'Compra' },
      actor,
    );

    expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: InventoryMovementType.ADJUSTMENT_IN,
          quantityBefore: 50,
          quantityAfter: 70,
          quantityDelta: 20,
          note: 'Compra',
        }),
      }),
    );
    expect(tx.inventoryConsumption.create).not.toHaveBeenCalled();
  });

  it('update with lower quantity appends ADJUSTMENT_OUT and consumption', async () => {
    prisma.inventoryProduct.findUnique.mockResolvedValue({
      ...product,
      currentQuantity: 70,
    });
    tx.inventoryProduct.update.mockResolvedValue({
      ...product,
      currentQuantity: 65,
    });

    await service.update(product.id, { currentQuantity: 65 }, actor);

    expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: InventoryMovementType.ADJUSTMENT_OUT,
          quantityDelta: -5,
        }),
      }),
    );
    expect(tx.inventoryConsumption.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantityConsumed: 5,
          totalCost: 50,
        }),
      }),
    );
  });

  it('deactivate appends DEACTIVATED movement', async () => {
    prisma.inventoryProduct.findUnique.mockResolvedValue(product);
    tx.inventoryProduct.update.mockResolvedValue({
      ...product,
      active: false,
    });

    await service.deactivate(product.id, actor);

    expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: InventoryMovementType.DEACTIVATED,
          quantityBefore: 50,
          quantityAfter: 50,
          quantityDelta: 0,
        }),
      }),
    );
  });

  it('findHistory returns paginated movements for inactive product', async () => {
    prisma.inventoryProduct.findUnique.mockResolvedValue({
      ...product,
      active: false,
    });
    prisma.inventoryMovement.findMany.mockResolvedValue([{ id: 'mov-1' }]);
    prisma.inventoryMovement.count.mockResolvedValue(1);

    const result = await service.findHistory(product.id, { limit: 50, offset: 0 });

    expect(result).toEqual({
      data: [{ id: 'mov-1' }],
      total: 1,
      limit: 50,
      offset: 0,
    });
  });
});
