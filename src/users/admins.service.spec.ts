import { ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminsService } from './admins.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('AdminsService', () => {
  let service: AdminsService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new AdminsService(prisma as never);
  });

  it('creates a new admin with a generated temp password when the e-mail does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u1',
      name: 'Maicon',
      email: 'maicon@bgggarage.com',
      role: Role.ADMIN,
    });

    const result = await service.create({
      name: 'Maicon',
      email: 'maicon@bgggarage.com',
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: Role.ADMIN, email: 'maicon@bgggarage.com' }),
      }),
    );
    expect(result.action).toBe('created');
    expect(result.tempPassword).toEqual(expect.any(String));
  });

  it('promotes an existing non-admin user without touching the password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      name: 'Fernanda',
      email: 'fernanda@bgggarage.com',
      role: Role.TECHNICIAN,
    });
    prisma.user.update.mockResolvedValue({
      id: 'u2',
      name: 'Fernanda',
      email: 'fernanda@bgggarage.com',
      role: Role.ADMIN,
    });

    const result = await service.create({
      name: 'Fernanda',
      email: 'fernanda@bgggarage.com',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u2' },
        data: expect.objectContaining({ role: Role.ADMIN }),
      }),
    );
    expect(result.action).toBe('promoted');
    expect((result as { tempPassword?: string }).tempPassword).toBeUndefined();
  });

  it('rejects when the e-mail already belongs to an admin', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u3',
      email: 'admin@bgggarage.com',
      role: Role.ADMIN,
    });

    await expect(
      service.create({ name: 'Admin', email: 'admin@bgggarage.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
