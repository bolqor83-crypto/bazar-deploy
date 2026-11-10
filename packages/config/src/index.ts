/**
 * Общие конфигурации рабочего пространства Bazar.
 *
 * Базовые tsconfig / ESLint / Prettier на этапе каркаса живут в корне
 * репозитория (tsconfig.base.json, eslint.config.js, .prettierrc).
 * Сюда переедут shared-пресеты, когда в них появится необходимость.
 */
export const workspaceInfo = {
  name: '@bazar/config',
  root: 'bazar',
} as const;
