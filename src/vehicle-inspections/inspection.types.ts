export type InspectionItemStatus = 'ok' | 'warn' | 'na';

export type InspectionItem = {
  itemKey: string;
  status: InspectionItemStatus | null;
  note: string;
  photoUrls: string[];
};

export type InspectionPhase = {
  generalPhotoUrls: string[];
  notes: string;
  items: InspectionItem[];
};

export const EMPTY_PHASE: InspectionPhase = {
  generalPhotoUrls: [],
  notes: '',
  items: [],
};

export function phaseHasContent(phase: InspectionPhase | undefined): boolean {
  if (!phase) return false;
  if (phase.generalPhotoUrls.length > 0) return true;
  if (phase.notes.trim()) return true;
  return phase.items.some(
    (item) =>
      item.status != null
      || item.note.trim()
      || item.photoUrls.length > 0,
  );
}

export function parsePhase(raw: unknown): InspectionPhase {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_PHASE };
  const data = raw as Record<string, unknown>;
  return {
    generalPhotoUrls: Array.isArray(data.generalPhotoUrls)
      ? data.generalPhotoUrls.filter((u): u is string => typeof u === 'string')
      : [],
    notes: typeof data.notes === 'string' ? data.notes : '',
    items: Array.isArray(data.items)
      ? data.items.map((item) => {
          const row = item as Record<string, unknown>;
          return {
            itemKey: typeof row.itemKey === 'string' ? row.itemKey : '',
            status:
              row.status === 'ok' || row.status === 'warn' || row.status === 'na'
                ? row.status
                : null,
            note: typeof row.note === 'string' ? row.note : '',
            photoUrls: Array.isArray(row.photoUrls)
              ? row.photoUrls.filter((u): u is string => typeof u === 'string')
              : [],
          };
        })
      : [],
  };
}
