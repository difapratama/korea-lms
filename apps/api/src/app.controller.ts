import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './infrastructure/prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      application: 'Korea LMS API',
    };
  }

  @Get('health/database')
  async databaseHealth() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'connected',
      database: 'postgresql',
    };
  }
}
