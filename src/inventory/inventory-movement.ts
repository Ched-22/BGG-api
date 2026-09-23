import { InventoryMovementType, Prisma } from '@prisma/client';
import { TaskLogActor } from '../tasks/task-log';

export type InventoryMovementActor = TaskLogActor | { id?: string; name: string };

export interface AppendMovementInput {
  productId: string;
  type: InventoryMovementType;
  quantityBefore: number;
  quantityAfter: number;
  unitCostSnapshot: number;
  note?: string | null;
  actor: InventoryMovementActor;
  occurredAt?: Date;
}

export function appendMovement(
  tx: Prisma.TransactionClient,
  input: AppendMovementInput,
) {
  const quantityDelta = input.quantityAfter - input.quantityBefore;
  const actorName = input.actor.name?.trim() || 'Usuário';

  return tx.inventoryMovement.create({
    data: {
      productId: input.productId,
      type: input.type,
      quantityBefore: input.quantityBefore,
      quantityAfter: input.quantityAfter,
      quantityDelta,
      unitCostSnapshot: input.unitCostSnapshot,
      note: input.note?.trim() || null,
      actorId: input.actor.id || null,
      actorName,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}

export function movementTypeForQuantityChange(
  before: number,
  after: number,
): InventoryMovementType | null {
  if (after > before) return InventoryMovementType.ADJUSTMENT_IN;
  if (after < before) return InventoryMovementType.ADJUSTMENT_OUT;
  return null;
}
