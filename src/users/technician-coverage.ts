import { ServiceCategory } from '@prisma/client';

export type CoverageProfile =
  | 'NONE'
  | 'EXTERIOR_ONLY'
  | 'INTERIOR_ONLY'
  | 'COMPLETE_ONLY'
  | 'MOTO_ONLY'
  | 'MOTO_EXTERIOR'
  | 'MOTO_INTERIOR'
  | 'FULL'
  | 'MIXED';

export function computeCoverageProfile(
  categories: ServiceCategory[],
): CoverageProfile {
  const set = new Set(categories);
  if (!set.size) return 'NONE';

  const hasExterior = set.has(ServiceCategory.EXTERIOR);
  const hasInterior = set.has(ServiceCategory.INTERIOR);
  const hasComplete = set.has(ServiceCategory.COMPLETE);
  const hasMoto = set.has(ServiceCategory.MOTO);

  if (set.size === 1) {
    if (hasExterior) return 'EXTERIOR_ONLY';
    if (hasInterior) return 'INTERIOR_ONLY';
    if (hasComplete) return 'COMPLETE_ONLY';
    if (hasMoto) return 'MOTO_ONLY';
  }

  if (hasMoto && hasExterior && !hasInterior && !hasComplete) {
    return 'MOTO_EXTERIOR';
  }
  if (hasMoto && hasInterior && !hasExterior && !hasComplete) {
    return 'MOTO_INTERIOR';
  }
  if (hasExterior && hasInterior && hasComplete) {
    return 'FULL';
  }

  return 'MIXED';
}

export function extractActiveServiceCategories(
  services: Array<{ serviceCategory: ServiceCategory; active: boolean }>,
): ServiceCategory[] {
  return [
    ...new Set(
      services.filter((s) => s.active).map((s) => s.serviceCategory),
    ),
  ];
}
