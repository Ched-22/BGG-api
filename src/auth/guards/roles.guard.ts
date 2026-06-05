import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user?.role) {
      throw new ForbiddenException('Autenticação necessária');
    }

    const allowed = requiredRoles.some((role) => user.role === role);
    if (!allowed) {
      throw new ForbiddenException(
        'Acesso negado: esta área requer perfil de administrador',
      );
    }

    return true;
  }
}
