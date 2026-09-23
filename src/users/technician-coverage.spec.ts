import { ServiceCategory } from '@prisma/client';
import {
  computeCoverageProfile,
  extractActiveServiceCategories,
} from './technician-coverage';

describe('technician-coverage', () => {
  describe('computeCoverageProfile', () => {
    it('returns NONE for empty categories', () => {
      expect(computeCoverageProfile([])).toBe('NONE');
    });

    it('returns single-category profiles', () => {
      expect(computeCoverageProfile([ServiceCategory.EXTERIOR])).toBe('EXTERIOR_ONLY');
      expect(computeCoverageProfile([ServiceCategory.INTERIOR])).toBe('INTERIOR_ONLY');
      expect(computeCoverageProfile([ServiceCategory.COMPLETE])).toBe('COMPLETE_ONLY');
      expect(computeCoverageProfile([ServiceCategory.MOTO])).toBe('MOTO_ONLY');
    });

    it('returns MOTO_EXTERIOR and MOTO_INTERIOR', () => {
      expect(
        computeCoverageProfile([ServiceCategory.MOTO, ServiceCategory.EXTERIOR]),
      ).toBe('MOTO_EXTERIOR');
      expect(
        computeCoverageProfile([ServiceCategory.MOTO, ServiceCategory.INTERIOR]),
      ).toBe('MOTO_INTERIOR');
    });

    it('returns FULL when exterior, interior and complete are present', () => {
      expect(
        computeCoverageProfile([
          ServiceCategory.EXTERIOR,
          ServiceCategory.INTERIOR,
          ServiceCategory.COMPLETE,
        ]),
      ).toBe('FULL');
      expect(
        computeCoverageProfile([
          ServiceCategory.MOTO,
          ServiceCategory.EXTERIOR,
          ServiceCategory.INTERIOR,
          ServiceCategory.COMPLETE,
        ]),
      ).toBe('FULL');
    });

    it('returns MIXED for other combinations', () => {
      expect(
        computeCoverageProfile([ServiceCategory.EXTERIOR, ServiceCategory.INTERIOR]),
      ).toBe('MIXED');
    });
  });

  describe('extractActiveServiceCategories', () => {
    it('ignores inactive services', () => {
      expect(
        extractActiveServiceCategories([
          { serviceCategory: ServiceCategory.EXTERIOR, active: true },
          { serviceCategory: ServiceCategory.MOTO, active: false },
        ]),
      ).toEqual([ServiceCategory.EXTERIOR]);
    });
  });
});
