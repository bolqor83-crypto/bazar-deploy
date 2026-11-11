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
 */
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import pino from 'pino';
import { version as pkgVersion } from '../package.json';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';
import { getRequestId, runWithRequestId } from './common/request-context';
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

  // HTTP-логи pino: метод, URL, статус, requestId. Без тел и заголовков.
  app.use(
    pinoHttp({
      genReqId: () => getRequestId() ?? crypto.randomUUID(),
      logger: pino({
        level: env.NODE_ENV === 'test' ? 'silent' : 'info',
        base: undefined,
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
      autoLogging: {
        ignore: (req) => {
          const url = (req as { url?: string }).url ?? '';
          return url.startsWith('/api/docs');
        },
      },
      serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
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
