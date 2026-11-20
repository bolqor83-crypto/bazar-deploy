/**
 * Точка входа API Bazar (Промт 7).
 *
 * Один порт отдаёт и API (/api/*), и статику mobile (SPA-fallback
 * для Expo Router) — схема деплоя через preview-шлюз платформы,
 * где шлюз проксирует ровно один порт (см. ADR 0008).
 *
 * Безопасность: helmet, CORS, глобальный префикс /api, Swagger на
 * /api/docs, pino-логи с requestId. Тела запросов и заголовки не
 * логируются — там бывают пароли и токены.
 *
 * Промт 18: HTTP-лог — структурированная запись на каждый запрос:
 * requestId, userId (из JWT, если есть), action (METHOD + путь),
 * status и duration_ms. pinoHttp заменён явным middleware — имена
 * полей соответствуют контракту логирования (Промт 18, ADR 0018).
 */
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import pino from 'pino';
import { version as pkgVersion } from '../package.json';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';
import { getRequestId, runWithRequestId } from './common/request-context';
import { httpLogger, userIdFromAuthHeader } from './common/http-log';
import { PrismaService } from './prisma/prisma.service';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  process.env.APP_VERSION = process.env.APP_VERSION ?? pkgVersion;

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // Префикс API: маршруты контроллеров живут под /api, статика — на /.
  app.setGlobalPrefix('api');

  // Базовые заголовки безопасности.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // CORS: same-origin в демо (API и статика на одном порту);
  // origins настраиваются для web-клиента в Промте 9.
  if (env.CORS_ORIGINS) {
    app.enableCors({
      origin: env.CORS_ORIGINS.split(',')
        .map((o) => o.trim())
        .filter(Boolean),
      credentials: true,
    });
  } else {
    app.enableCors();
  }

  // requestId: из заголовка клиента или новый; пробрасывается в ответ
  // и в AsyncLocalStorage для структурированных логов сервисов.
  app.use(
    (
      req: { headers: Record<string, unknown> },
      res: unknown,
      next: () => void,
    ) => {
      const header = req.headers['x-request-id'];
      const requestId =
        typeof header === 'string' && header.length > 0
          ? header
          : crypto.randomUUID();
      const response = res as { setHeader: (k: string, v: string) => void };
      response.setHeader('X-Request-Id', requestId);
      runWithRequestId(requestId, next);
    },
  );

  // HTTP-лог (Промт 18): структурированная запись на завершение
  // запроса — requestId, userId (если есть JWT), action, status,
  // duration_ms. Регистрируется внутри requestId-контекста, поэтому
  // слушатель finish видит requestId через AsyncLocalStorage.
  app.use(
    (
      req: { method?: string; url?: string; headers?: Record<string, unknown> },
      res: {
        statusCode?: number;
        on: (event: string, listener: () => void) => void;
      },
      next: () => void,
    ) => {
      const method = req.method ?? 'GET';
      const url = req.url ?? '';
      const path = url.split('?')[0];
      const start = process.hrtime.bigint();
      res.on('finish', () => {
        if (path.startsWith('/api/docs')) {
          return;
        }
        const durationMs = Math.round(
          Number(process.hrtime.bigint() - start) / 1_000_000,
        );
        httpLogger.info(
          {
            requestId: getRequestId(),
            userId: userIdFromAuthHeader(req.headers),
            action: `${method} ${path}`,
            method,
            url: path,
            status: res.statusCode ?? 0,
            duration_ms: durationMs,
          },
          'http.request',
        );
      });
      next();
    },
  );

  // OpenAPI: /api/docs (Swagger UI) и /api/docs-json.
  setupSwagger(app);

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks();

  await app.listen(env.PORT, '0.0.0.0');
  process.stdout.write(
    `API Bazar: http://localhost:${env.PORT}/api (health: /api/health, docs: /api/docs)\n`,
  );
}

void bootstrap();
