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
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new AuthService(prisma as never, { sign: mockSign } as never);
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
});
