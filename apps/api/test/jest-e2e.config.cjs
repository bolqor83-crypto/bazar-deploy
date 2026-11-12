/**
 * Jest: e2e-тесты API (supertest, реальное приложение + PostgreSQL Neon).
 *
 * runInBand обязателен: тесты используют общую тестовую БД bazar_test.
 * testTimeout повышен: Neon за сетью (eu-central-1) + Argon2id
 * медленнее локального SQLite (Промт 9, Часть A).
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
  testTimeout: 30000,
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
