/**
 * Обёртка над PrismaClient с жизненным циклом Nest-приложения.
 *
 * Подключение устанавливается в onModuleInit, корректное
 * отключение — в beforeExit (рекомендация Prisma для NestJS).
 */
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async enableShutdownHooks(): Promise<void> {
    process.once('beforeExit', async () => {
      await this.$disconnect();
    });
  }
}
