/**
 * Валидация переменных окружения через zod (Промт 7).
 *
 * Приложение не стартует с невалидным ENV: ошибка с перечнем
 * проблем падает на этапе bootstrap. Секреты читаются только
 * отсюда — в логи и ответы они не попадают.
 */
import { z } from 'zod';

const schema = z.object({
  /** Порт HTTP. В песочнице — 3000: preview-шлюз платформы. */
  PORT: z.coerce.number().int().positive().default(3000),
  /** development | production | test. */
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  /** Строка подключения Prisma. Демо: file:./dev.db. */
  DATABASE_URL: z.string().min(1).default('file:./dev.db'),
  /** Секрет подписи access-JWT (HS256). Обязателен. */
  JWT_ACCESS_SECRET: z.string().min(32),
  /** TTL access-токена, секунды. По умолчанию 15 минут. */
  JWT_ACCESS_TTL_SEC: z.coerce.number().int().positive().default(900),
  /** TTL refresh-токена, секунды. По умолчанию 30 дней. */
  REFRESH_TTL_SEC: z.coerce.number().int().positive().default(2592000),
  /**
   * Разрешённые CORS-origin (через запятую). Пусто — без ограничений
   * (демо: API и статика живут на одном origin).
   */
  CORS_ORIGINS: z.string().default(''),
  /** Отключить rate limiting (только для тестов). */
  THROTTLER_DISABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  /** Корень статики mobile (ServeStaticModule). Пусто — не отдавать. */
  MOBILE_DIST_PATH: z.string().default(''),
});

export type Env = z.infer<typeof schema>;

/** Разобранный ENV. Кэшируется: валидация выполняется один раз. */
let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) {
    return cached;
  }
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Невалидные переменные окружения: ${details}`);
  }
  cached = parsed.data;
  return cached;
}

/** Только для тестов: сброс кэша после изменения process.env. */
export function __resetEnvCacheForTests(): void {
  cached = null;
}
