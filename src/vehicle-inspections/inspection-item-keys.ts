export const INSPECTION_ITEM_KEYS = [
  'lataria',
  'vidros',
  'farois',
  'pneus',
  'estepe',
  'oleo',
  'arref',
  'freio_fl',
  'freios',
  'setas',
  'palhetas',
  'cinto',
  'bancos',
  'bateria',
  'ac',
  'doc',
] as const;

export type InspectionItemKey = (typeof INSPECTION_ITEM_KEYS)[number];

export function isValidItemKey(key: string): key is InspectionItemKey {
  return (INSPECTION_ITEM_KEYS as readonly string[]).includes(key);
}
