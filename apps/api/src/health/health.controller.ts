/**
 * Health-check: /api/health (Промт 10 — расширенный).
 *
 * { status, db, s3, sms, version (commit SHA), uptime }.
 * Публичный маршрут без аутентификации; таймаут БД — 2 секунды,
 * чтобы health не вис на мёртвом соединении (Render-пробы).
 */
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SMS_PROVIDER } from '../sms/sms.module';
import type { SmsProvider } from '../sms/sms-provider.interface';
import { loadEnv } from '../config/env';

export interface HealthResponse {
  status: 'ok' | 'error';
  db: 'ok' | 'error';
  s3: 'ok' | 'disabled';
  sms: 'console' | 'twilio' | 'none';
  version: string;
  uptimeSec: number;
}

const BOOT_TIME = Date.now();

@ApiTags('Служебные')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Живость сервиса: БД, S3, SMS, версия' })
  async check(): Promise<HealthResponse> {
    let db: 'ok' | 'error' = 'error';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'ok';
    } catch {
      db = 'error';
    }
    const s3Configured = Boolean(loadEnv().S3_BUCKET);
    return {
      status: db === 'ok' ? 'ok' : 'error',
      db,
      s3: s3Configured ? 'ok' : 'disabled',
      sms: this.sms.name,
      version:
        process.env.GIT_COMMIT ??
        process.env.RENDER_GIT_COMMIT ??
        process.env.APP_VERSION ??
        'dev',
      uptimeSec: Math.round((Date.now() - BOOT_TIME) / 1000),
    };
  }
}
