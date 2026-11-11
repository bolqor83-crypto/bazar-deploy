/**
 * Health-check: /api/health.
 *
 * Проверяет подключение к БД (SELECT 1) и отдаёт версию сборки.
 * Публичный маршрут — без аутентификации.
 */
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Служебные')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Живость сервиса и БД' })
  async check(): Promise<{
    status: 'ok' | 'error';
    db: 'ok' | 'error';
    version: string;
  }> {
    let db: 'ok' | 'error' = 'error';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'ok';
    } catch {
      db = 'error';
    }
    return {
      status: db === 'ok' ? 'ok' : 'error',
      db,
      version: process.env.APP_VERSION ?? 'dev',
    };
  }
}
