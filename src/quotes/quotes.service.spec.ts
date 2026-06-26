import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { QuotesService } from './quotes.service';

describe('QuotesService technician service validation', () => {
  const prisma = {
    quote: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  };
  const catalogService = {
    getTechnicianServiceCodes: jest.fn(),
    buildSnapshots: jest.fn(),
    computeTotalFromSnapshots: jest.fn(),
  };
  const clientVehicleSync = {
    syncForQuote: jest.fn().mockResolvedValue({}),
  };
  const taskLogService = { appendForQuote: jest.fn() };
  const tasksService = {};
  const inAppNotifications = {};

  let service: QuotesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QuotesService(
      prisma as never,
      taskLogService as never,
      tasksService as never,
      clientVehicleSync as never,
      inAppNotifications as never,
      catalogService as never,
    );
    catalogService.getTechnicianServiceCodes.mockResolvedValue(['polim']);
    prisma.quote.create.mockResolvedValue({ id: 'quote-1', createdAt: new Date() });
  });

  it('rejects quote with unauthorized service for technician', async () => {
    await expect(
      service.create(
        {
          clientName: 'Cliente',
          brand: 'BMW',
          model: '320',
          plate: 'AA00BB',
          services: ['ppf'],
        } as never,
        { id: 'tech-1', email: 'tech@test.com', role: Role.TECHNICIAN },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.quote.create).not.toHaveBeenCalled();
  });

  it('rejects quote with services when technician has none assigned', async () => {
    catalogService.getTechnicianServiceCodes.mockResolvedValue([]);

    await expect(
      service.create(
        {
          clientName: 'Cliente',
          brand: 'BMW',
          model: '320',
          plate: 'AA00BB',
          services: ['polim'],
        } as never,
        { id: 'tech-1', email: 'tech@test.com', role: Role.TECHNICIAN },
      ),
    ).rejects.toMatchObject({
      response: { message: 'Nenhum serviço atribuído ao seu perfil' },
    });
  });
});
