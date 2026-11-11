/** Jest: unit-тесты сервисов API (моки Prisma). */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',
  roots: ['<rootDir>/test/unit', '<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  setupFiles: ['<rootDir>/test/unit/setup-env.cjs'],
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
  collectCoverageFrom: ['src/**/*.ts'],
};
