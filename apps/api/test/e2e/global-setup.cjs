/**
 * globalSetup e2e: накат схемы на тестовую SQLite-БД.
 */
const { execSync } = require('node:child_process');
const { resolve } = require('node:path');
const { rm } = require('node:fs/promises');

module.exports = async () => {
  const dbFile = resolve(__dirname, '../../prisma/test-e2e.db');
  await rm(dbFile, { force: true });
  execSync('npx prisma db push --skip-generate', {
    cwd: resolve(__dirname, '../..'),
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: 'file:./test-e2e.db' },
  });
};
