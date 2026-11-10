/** Конфигурация Jest для дизайн-системы Bazar. */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    // lucide-react-native при условии react-native отдаёт ESM (.mjs), который Jest
    // не трансформирует; направляем на CJS-сборку.
    '^lucide-react-native$': '<rootDir>/../../node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
};
