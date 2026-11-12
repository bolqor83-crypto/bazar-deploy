/**
 * setupFiles для unit-тестов: ENV до импорта модулей приложения.
 *
 * Unit-тесты не ходят в БД (моки Prisma), но PrismaClient при
 * импорте валидирует схему — datasource-переменные задаются
 * фиктивными валидными PostgreSQL-URI (Промт 9: провайдер —
 * postgresql; реального подключения не происходит).
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL_POOLED =
  'postgresql://unit:unit@localhost:5432/unit?schema=public';
process.env.DATABASE_URL_DIRECT =
  'postgresql://unit:unit@localhost:5432/unit?schema=public';
process.env.JWT_ACCESS_SECRET =
  'unit-test-secret-0123456789abcdef0123456789abcdef';
process.env.THROTTLER_DISABLED = 'true';
process.env.JWT_ACCESS_TTL_SEC = '900';
process.env.REFRESH_TTL_SEC = '2592000';
