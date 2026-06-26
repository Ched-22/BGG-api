import { CatalogService, CatalogServicePrice } from '@prisma/client';

export type CatalogServiceWithCurrentPrice = CatalogService & {
  prices: CatalogServicePrice[];
};

export function mapPriceDto(price: CatalogServicePrice) {
  return {
    priceSmall: price.priceSmall,
    priceMedium: price.priceMedium,
    priceLarge: price.priceLarge,
    effectiveFrom: price.effectiveFrom.toISOString(),
    effectiveTo: price.effectiveTo?.toISOString() ?? null,
    priceVersionId: price.id,
  };
}

export function mapCatalogServiceDto(
  service: CatalogServiceWithCurrentPrice,
  currentPrice?: CatalogServicePrice | null,
) {
  const price = currentPrice ?? service.prices[0] ?? null;
  return {
    id: service.id,
    code: service.code,
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    serviceCategory: service.serviceCategory,
    active: service.active,
    prices: price ? mapPriceDto(price) : null,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

export function mapCatalogServiceDetailDto(
  service: CatalogService,
  priceHistory: CatalogServicePrice[],
) {
  const current = priceHistory.find((p) => !p.effectiveTo) ?? priceHistory[0] ?? null;
  return {
    ...mapCatalogServiceDto({ ...service, prices: current ? [current] : [] }, current),
    priceHistory: priceHistory.map(mapPriceDto),
  };
}
