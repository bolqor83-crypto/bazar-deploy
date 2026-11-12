/**
 * globalSetup e2e: пересоздание схемы на тестовой БД Neon bazar_test.
 *
 * prisma db push --force-reset — дроп и пересоздание схемы
 * (аналог удаления файла test-e2e.db в эпоху SQLite, Промт 7-8).
 * Подключение — direct: интерактивные транзакции тестов требуют
 * минования PgBouncer (ADR 0010).
 */
const { execSync } = require('node:child_process');
const { resolve } = require('node:path');
const { applyTestEnv } = require('./neon-env.cjs');

module.exports = async () => {
  applyTestEnv();
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: resolve(__dirname, '../..'),
    stdio: 'pipe',
    env: { ...process.env },
  });
};
