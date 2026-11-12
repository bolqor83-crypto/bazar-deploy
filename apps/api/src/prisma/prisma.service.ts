/**
 * Обёртка над PrismaClient с жизненным циклом Nest-приложения.
 *
 * Подключение устанавливается в onModuleInit, корректное
 * отключение — в beforeExit (рекомендация Prisma для NestJS).
 *
 * Datasource URL (Промт 9, ADR 0010): long-running NestJS-процесс
 * работает через DATABASE_URL_DIRECT — интерактивные транзакции
 * ($transaction: ротация refresh-токенов, stock-резерв заказов)
 * не поддерживаются за PgBouncer transaction-pooling.
 * DATABASE_URL_POOLED остаётся в схеме для serverless (Промт 10).
 */
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Прямое подключение; fallback на pooled — если direct не задан. */
function runtimeDatabaseUrl(): string | undefined {
  const direct = process.env.DATABASE_URL_DIRECT;
  if (direct && direct.startsWith('postgres')) {
    return direct;
  }
  return process.env.DATABASE_URL_POOLED;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({ datasources: { db: { url: runtimeDatabaseUrl() } } });
  }
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async enableShutdownHooks(): Promise<void> {
    process.once('beforeExit', async () => {
      await this.$disconnect();
    });
  }
}
