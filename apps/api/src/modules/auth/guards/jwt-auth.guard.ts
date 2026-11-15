
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export type AuthRequest = Request & {
  user: {
    id: string;
    role: string;
  };
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthRequest>();

    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Access token diperlukan',
      );
    }

    const token = authorization.slice(7);

    try {
      const payload =
        await this.jwt.verifyAsync<{
          sub: string;
          role: string;
        }>(token, {
          secret: this.config.getOrThrow<string>(
            'JWT_ACCESS_SECRET',
          ),
          algorithms: ['HS256'],
        });

      if (
        typeof payload.sub !== 'string' ||
        typeof payload.role !== 'string'
      ) {
        throw new UnauthorizedException();
      }

      request.user = {
        id: payload.sub,
        role: payload.role,
      };

      return true;
    } catch {
      throw new UnauthorizedException(
        'Access token tidak valid atau kedaluwarsa',
      );
    }
  }
}
