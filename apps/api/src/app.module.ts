/**
 * Корневой модуль API Bazar.
 *
 * Глобальные механизмы:
 * - ValidationPipe: DTO проверяются class-validator, неизвестные
 *   поля отбрасываются (whitelist);
 * - JwtAuthGuard через APP_GUARD: все маршруты требуют Bearer,
 *   кроме @Public();
 * - AppThrottlerGuard: лимиты auth 5/мин, refresh 30/мин,
 *   default 100/мин (in-memory storage — открытый вопрос ADR 0008);
 * - ServeStaticModule: раздача статики mobile (../mobile/dist) на /,
 *   SPA-fallback для маршрутов Expo Router, /api/* исключён.
 */
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from './config/env';
import { AppLogger } from './common/app-logger';
import { HttpApiExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AppThrottlerGuard } from './common/guards/throttler.guard';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './orders/order.module';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations/locations.module';
import { PrismaModule } from './prisma/prisma.module';
import { SmsModule } from './sms/sms.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';

/** Каталог сборки mobile: ENV → cwd → __dirname (apps/mobile/dist). */
function mobileDistPath(): string | null {
  const configured = loadEnv().MOBILE_DIST_PATH;
  if (configured) {
    return configured;
  }
  const candidates = [
    join(process.cwd(), '..', 'mobile', 'dist'),
    join(__dirname, '..', '..', '..', 'mobile', 'dist'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Глобальная валидация DTO: whitelist + transform. */
const ValidationPipeConfig = new ValidationPipe({
  whitelist: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
});

@Module({
  imports: [
    // Один бакет 'default' (100/мин на IP) на все маршруты; лимиты
    // auth-эндпоинтов переопределяются декораторами @Throttle в
    // контроллерах (именованные бакеты v6 суммируются на каждом
    // маршруте — поэтому именно такая схема).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    ...(mobileDistPath()
      ? [
          ServeStaticModule.forRoot({
            rootPath: mobileDistPath() as string,
            // path-to-regexp v8: именованный wildcard.
            exclude: ['/api/*splat'],
          }),
        ]
      : []),
    PrismaModule,
    SmsModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    LocationsModule,
    CatalogModule,
    CartModule,
    OrderModule,
    HealthModule,
  ],
  providers: [
    AppLogger,
    { provide: APP_PIPE, useValue: ValidationPipeConfig },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: HttpApiExceptionFilter },
  ],
})
export class AppModule {}
