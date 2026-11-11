/**
 * setupFiles для e2e: ENV до импорта модулей приложения.
 *
 * Тестовая БД — отдельный файл prisma/test-e2e.db (схему накатывает
 * global-setup через prisma db push). Throttler выключен, кроме
 * специального файла rate-limit.e2e-spec.ts.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test-e2e.db';
process.env.JWT_ACCESS_SECRET =
  'e2e-test-secret-0123456789abcdef0123456789abcdef';
process.env.THROTTLER_DISABLED = 'true';
process.env.JWT_ACCESS_TTL_SEC = '900';
process.env.REFRESH_TTL_SEC = '2592000';
process.env.MOBILE_DIST_PATH = '';
