import { VehicleInspection } from '@prisma/client';
import { InspectionPhase, parsePhase } from './inspection.types';

export function mapInspectionToDto(row: VehicleInspection | null, assignment: {
  appointmentId?: string;
  taskDisplayId?: string;
}) {
  if (!row) {
    return {
      id: null,
      appointmentId: assignment.appointmentId ?? null,
      taskDisplayId: assignment.taskDisplayId ?? null,
      entry: parsePhase(null),
      exit: parsePhase(null),
      entryFinalizedAt: null,
      exitFinalizedAt: null,
      reportStatus: 'DRAFT',
      submittedForReviewAt: null,
      sentToClientAt: null,
      createdAt: null,
      updatedAt: null,
    };
  }

  return {
    id: row.id,
    appointmentId: row.appointmentId,
    taskDisplayId: row.taskDisplayId,
    entry: parsePhase(row.entryData),
    exit: parsePhase(row.exitData),
    entryFinalizedAt: row.entryFinalizedAt?.toISOString() ?? null,
    exitFinalizedAt: row.exitFinalizedAt?.toISOString() ?? null,
    reportStatus: row.reportStatus,
    submittedForReviewAt: row.submittedForReviewAt?.toISOString() ?? null,
    sentToClientAt: row.sentToClientAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mergePhase(
  current: InspectionPhase,
  patch: Partial<InspectionPhase> | undefined,
): InspectionPhase {
  if (!patch) return current;
  return {
    generalPhotoUrls: patch.generalPhotoUrls ?? current.generalPhotoUrls,
    notes: patch.notes ?? current.notes,
    items: patch.items ?? current.items,
  };
}

export function countEntryPhotos(entry: InspectionPhase): number {
  const itemPhotos = entry.items.reduce((sum, item) => sum + item.photoUrls.length, 0);
  return entry.generalPhotoUrls.length + itemPhotos;
}

export function countEntryItems(entry: InspectionPhase): number {
  return entry.items.filter((item) => item.status === 'ok' || item.status === 'warn').length;
}

export function findDiffKeys(entry: InspectionPhase, exit: InspectionPhase): string[] {
  const exitByKey = new Map(exit.items.map((item) => [item.itemKey, item]));
  const diffs: string[] = [];
  for (const entryItem of entry.items) {
    const exitItem = exitByKey.get(entryItem.itemKey);
    if (entryItem.status === 'ok' && exitItem?.status === 'warn') {
      diffs.push(entryItem.itemKey);
    }
  }
  return diffs;
}
