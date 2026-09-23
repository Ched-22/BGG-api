export type ServiceSnapshot = {
  serviceId: string;
  code: string;
  name: string;
  unitPrice: number;
  priceVersionId: string;
  durationMinutes: number;
  approximate?: boolean;
};

export function asServiceCodes(services: unknown): string[] {
  if (!Array.isArray(services)) return [];
  return services.filter(
    (code): code is string => typeof code === 'string' && code.trim().length > 0,
  );
}

export function vehicleSizeToPriceField(
  vehicleSize?: string | null,
): 'priceSmall' | 'priceMedium' | 'priceLarge' {
  if (vehicleSize === 'pequeno') return 'priceSmall';
  if (vehicleSize === 'grande') return 'priceLarge';
  return 'priceMedium';
}

export function pickUnitPrice(
  price: { priceSmall: number; priceMedium: number; priceLarge: number },
  vehicleSize?: string | null,
): number {
  return price[vehicleSizeToPriceField(vehicleSize)];
}

export function sumSnapshotSubtotal(snapshots: ServiceSnapshot[]): number {
  return snapshots.reduce((sum, row) => sum + (row.unitPrice || 0), 0);
}
