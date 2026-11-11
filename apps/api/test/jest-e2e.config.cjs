/**
 * Jest: e2e-тесты API (supertest, реальное приложение + SQLite).
 *
 * runInBand обязателен: тесты используют общий файл тестовой БД.
 * THROTTLER_DISABLED=true, кроме rate-limit.e2e-spec.ts — тот файл
 * включает throttler динамически.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',
  roots: ['<rootDir>/test/e2e'],
  testMatch: ['**/*.e2e-spec.ts'],
  setupFiles: ['<rootDir>/test/e2e/setup-env.cjs'],
  globalSetup: '<rootDir>/test/e2e/global-setup.cjs',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        isolatedModules: false,
      },
    ],
  },
};
