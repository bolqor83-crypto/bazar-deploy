/**
 * setupFiles для e2e: ENV до импорта модулей приложения.
 *
 * Тестовая БД — bazar_test в Neon (схему пересоздаёт global-setup
 * через prisma db push --force-reset). Throttler выключен, кроме
 * специального файла rate-limit.e2e-spec.ts.
 */
const { applyTestEnv } = require('./neon-env.cjs');

applyTestEnv();
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET =
  'e2e-test-secret-0123456789abcdef0123456789abcdef';
process.env.THROTTLER_DISABLED = 'true';
process.env.JWT_ACCESS_TTL_SEC = '900';
process.env.REFRESH_TTL_SEC = '2592000';
process.env.MOBILE_DIST_PATH = '';
