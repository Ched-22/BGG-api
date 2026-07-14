import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';

const mockSign = jest.fn().mockReturnValue('jwt-token');

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    sign: mockSign,
  })),
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    passwordResetToken: {
      updateMany: jest.Mock;
      create: jest.Mock;
    };
  };

  let mailService: { sendMail: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      passwordResetToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'token1' }),
      },
    };
    mailService = { sendMail: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(
      prisma as never,
      { sign: mockSign } as never,
      mailService as never,
    );
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates TECHNICIAN user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u1',
        name: 'Pedro',
        email: 'pedro@test.com',
        role: Role.TECHNICIAN,
      });

      const result = await service.register({
        name: 'Pedro',
        email: 'pedro@test.com',
        password: 'Senha@123',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: Role.TECHNICIAN }),
        }),
      );
      expect(result.user.role).toBe(Role.TECHNICIAN);
      expect(result.access_token).toBe('jwt-token');
    });

    it('throws on duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.register({
          name: 'Pedro',
          email: 'pedro@test.com',
          password: 'Senha@123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('rejects google-only user without password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'g@test.com',
        password: null,
        role: Role.TECHNICIAN,
      });

      await expect(
        service.login({ email: 'g@test.com', password: 'any' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('requestPasswordReset', () => {
    const existingUser = {
      id: 'u1',
      email: 'admin@test.com',
      password: 'hashed-password',
      active: true,
      role: Role.ADMIN,
    };

    it('sends a reset e-mail when the account exists', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);

      const result = await service.requestPasswordReset({
        email: 'admin@test.com',
        client: 'admin',
      });

      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'admin@test.com' }),
      );
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });

    it('returns the generic message without sending e-mail when account does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset({
        email: 'unknown@test.com',
        client: 'admin',
      });

      expect(mailService.sendMail).not.toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });

    it('does not throw when e-mail sending fails', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);
      mailService.sendMail.mockRejectedValue(new Error('SMTP down'));

      await expect(
        service.requestPasswordReset({
          email: 'admin@test.com',
          client: 'admin',
        }),
      ).resolves.toEqual(expect.objectContaining({ message: expect.any(String) }));
    });
  });
});
