import { Role, ServiceCategory } from '@prisma/client';
import { ServiceCatalogService } from './catalog.service';

describe('ServiceCatalogService.findAll', () => {
  const prisma = {
    catalogService: { findMany: jest.fn() },
  };

  let service: ServiceCatalogService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ServiceCatalogService(prisma as never);
    prisma.catalogService.findMany.mockResolvedValue([
      {
        id: 'svc-1',
        code: 'polim',
        name: 'Polimento',
        description: null,
        durationMinutes: 120,
        serviceCategory: ServiceCategory.EXTERIOR,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        prices: [
          {
            id: 'price-1',
            priceSmall: 100,
            priceMedium: 120,
            priceLarge: 140,
            effectiveFrom: new Date(),
            effectiveTo: null,
          },
        ],
      },
    ]);
  });

  it('returns all active services for admin', async () => {
    await service.findAll({}, { id: 'admin-1', role: Role.ADMIN });

    expect(prisma.catalogService.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true },
      }),
    );
  });

  it('filters by technician profile for technician role', async () => {
    await service.findAll({}, { id: 'tech-1', role: Role.TECHNICIAN });

    expect(prisma.catalogService.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          active: true,
          technicians: { some: { userId: 'tech-1' } },
        },
      }),
    );
  });

  it('maps technician-filtered rows to dto list', async () => {
    const result = await service.findAll(
      {},
      { id: 'tech-1', role: Role.TECHNICIAN },
    );

    expect(result.total).toBe(1);
    expect(result.data[0].code).toBe('polim');
  });
});
