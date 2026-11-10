/**
 * Корневая конфигурация ESLint 9 (flat config) для всего монорепо Bazar.
 *
 * Выбор flat config вместо legacy .eslintrc.cjs обоснован в
 * docs/adr/0001-стек-и-монорепо.md: ESLint 9 использует flat config
 * по умолчанию, legacy-формат считается устаревшим и будет удалён
 * в следующих мажорных версиях ESLint.
 */
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/dist-dev/**',
    '**/web-build/**',
    '**/build/**',
    '**/.expo/**',
    '**/.expo-shared/**',
    '**/.turbo/**',
    '**/coverage/**',
  ]),
  expoConfig,
  {
    // Явная версия React: убирает warning "react is not installed"
    // в пакетах без зависимости от react (types, validation, config).
    settings: {
      react: { version: '19.3' },
    },
  },
  {
    files: ['**/*.{js,cjs,mjs,ts,tsx}'],
    rules: {
      // console.log запрещён (warn); console.warn и console.error разрешены.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // В новом коде не должно быть any.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Файлы настройки Jest: глобал jest.
    files: ['**/jest.setup.js'],
    languageOptions: {
      globals: { jest: 'readonly' },
    },
  },
  {
    // ВРЕМЕННО (см. ADR 0002): правила react-hooks/immutability и refs дают
    // ложные срабатывания на ворклеты и shared-значения Reanimated.
    // Вернуть, когда Reanimated получит совместимый линт-плагин.
    files: ['**/*.{ts,tsx}'],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
    },
  },
]);
