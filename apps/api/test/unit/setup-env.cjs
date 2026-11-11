/**
 * setupFiles для unit-тестов: ENV до импорта модулей приложения.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test-unit.db';
process.env.JWT_ACCESS_SECRET =
  'unit-test-secret-0123456789abcdef0123456789abcdef';
process.env.THROTTLER_DISABLED = 'true';
process.env.JWT_ACCESS_TTL_SEC = '900';
process.env.REFRESH_TTL_SEC = '2592000';
