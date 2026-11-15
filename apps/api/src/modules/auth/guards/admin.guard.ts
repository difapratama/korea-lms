import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { AuthRequest } from './jwt-auth.guard';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp()
      .getRequest<AuthRequest>();

    if (!request.user?.id) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: request.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Hanya admin yang dapat mengakses fitur ini',
      );
    }

    return true;
  }
}