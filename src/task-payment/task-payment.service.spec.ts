import { BadRequestException } from '@nestjs/common';
import { TaskPaymentService } from './task-payment.service';

describe('TaskPaymentService', () => {
  const prisma = {
    task: {
      findFirst: jest.fn(),
    },
    taskPayment: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const taskLogService = {
    appendByDisplayId: jest.fn(),
  };

  let service: TaskPaymentService;

  const admin = {
    id: 'admin-1',
    email: 'admin@test.com',
    role: 'ADMIN',
    name: 'Admin',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TaskPaymentService(prisma as never, taskLogService as never);
    prisma.task.findFirst.mockResolvedValue({
      id: 'task-1',
      displayId: 'TR-100',
      orcamento: { valor: 500, deposito: 0, saldo: 500 },
      payment: null,
    });
    prisma.taskPayment.create.mockResolvedValue({
      settlementStatus: 'paid',
      paymentMethod: 'card',
      iban: null,
      amount: 500,
      isInstallment: false,
      installmentCount: null,
      installmentsPaid: 0,
      paidAt: new Date('2026-06-27T12:00:00.000Z'),
      notes: null,
      updatedByUserId: 'admin-1',
      updatedAt: new Date('2026-06-27T12:00:00.000Z'),
    });
  });

  it('returns pending defaults when payment row is missing', async () => {
    const result = await service.getByDisplayId('TR-100');
    expect(result.settlementStatus).toBe('pending');
    expect(result.paymentStatus).toBe('pending');
    expect(result.amount).toBe(500);
  });

  it('requires iban for multibanco', async () => {
    await expect(service.upsertByDisplayId('TR-100', {
      settlementStatus: 'paid',
      paymentMethod: 'multibanco',
      amount: 500,
    }, admin as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates paid payment', async () => {
    const result = await service.upsertByDisplayId('TR-100', {
      settlementStatus: 'paid',
      paymentMethod: 'card',
      amount: 500,
    }, admin as never);

    expect(prisma.taskPayment.create).toHaveBeenCalled();
    expect(result.paymentStatus).toBe('completed');
    expect(taskLogService.appendByDisplayId).toHaveBeenCalled();
  });
});
