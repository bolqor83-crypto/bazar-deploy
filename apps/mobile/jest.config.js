/** Конфигурация Jest для мобильного приложения Bazar. */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@bazar/ui$': '<rootDir>/../../packages/ui/src/index.ts',
    '^@bazar/types$': '<rootDir>/../../packages/types/src/index.ts',
    // lucide-react-native при условии react-native отдаёт ESM (.mjs), который Jest
    // не трансформирует; направляем на CJS-сборку.
    '^lucide-react-native$': '<rootDir>/../../node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
};
