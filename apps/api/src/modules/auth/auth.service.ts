
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  private async createAccessToken(
    userId: string,
    role: string,
  ): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, role },
      {
        secret: this.config.getOrThrow<string>(
          'JWT_ACCESS_SECRET',
        ),
        expiresIn: '15m',
        algorithm: 'HS256',
      },
    );
  }

  private async createTokens(user: {
    id: string;
    role: string;
  }) {
    const accessToken =
      await this.createAccessToken(user.id, user.role);

    const secret = randomBytes(48).toString('hex');
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );

    const session = await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(secret),
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: `${session.id}.${secret}`,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException('Nama wajib diisi');
    }

    const passwordHash = await argon2.hash(dto.password);

    let user;

    try {
      user = await this.prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'STUDENT',
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Email sudah terdaftar',
        );
      }
      throw error;
    }

    const tokens = await this.createTokens(user);

    return {
      message: 'Registrasi berhasil',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Email atau password salah',
      );
    }

    const isValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isValid) {
      throw new UnauthorizedException(
        'Email atau password salah',
      );
    }

    const tokens = await this.createTokens(user);

    return {
      message: 'Login berhasil',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const [sessionId, secret, extra] =
      refreshToken.split('.');

    if (!sessionId || !secret || extra) {
      throw new UnauthorizedException(
        'Refresh token tidak valid',
      );
    }

    const session =
      await this.prisma.refreshSession.findUnique({
        where: { id: sessionId },
        include: { user: true },
      });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException(
        'Session tidak valid atau kedaluwarsa',
      );
    }

    const oldHash = this.hashToken(secret);

    if (session.tokenHash !== oldHash) {
      throw new UnauthorizedException(
        'Refresh token tidak valid',
      );
    }

    const newSecret = randomBytes(48).toString('hex');
    const newHash = this.hashToken(newSecret);
    const newExpiry = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );

    // Conditional update mencegah token lama
    // dipakai ulang dalam request bersamaan.
    const updated =
      await this.prisma.refreshSession.updateMany({
        where: {
          id: sessionId,
          tokenHash: oldHash,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          tokenHash: newHash,
          expiresAt: newExpiry,
        },
      });

    if (updated.count !== 1) {
      throw new UnauthorizedException(
        'Refresh token sudah digunakan',
      );
    }

    const accessToken =
      await this.createAccessToken(
        session.user.id,
        session.user.role,
      );

    return {
      accessToken,
      refreshToken: `${sessionId}.${newSecret}`,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }

  async logout(refreshToken: string) {
    const [sessionId, secret, extra] =
      refreshToken.split('.');

    if (!sessionId || !secret || extra) {
      throw new UnauthorizedException(
        'Refresh token tidak valid',
      );
    }

    const result =
      await this.prisma.refreshSession.updateMany({
        where: {
          id: sessionId,
          tokenHash: this.hashToken(secret),
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

    if (result.count !== 1) {
      throw new UnauthorizedException(
        'Session tidak ditemukan atau sudah dicabut',
      );
    }

    return { message: 'Logout berhasil' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Pengguna tidak ditemukan',
      );
    }

    return user;
  }
}
