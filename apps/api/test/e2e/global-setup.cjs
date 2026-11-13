/**
 * globalSetup e2e: пересоздание схемы на тестовой БД Neon bazar_test.
 *
 * prisma db push --force-reset — дроп и пересоздание схемы
 * (аналог удаления файла test-e2e.db в эпоху SQLite, Промт 7-8).
 * Подключение — direct: интерактивные транзакции тестов требуют
 * минования PgBouncer (ADR 0010).
 *
 * Надёжность (фикс красного CI-рана №9): DROP/ALTER во время
 * force-reset могут упереться в deadlock с висящей сессией
 * (ослабший коннект прошлого рана, PgBouncer-пул). Поэтому:
 * 1. перед сбросом — pg_terminate_backend всем чужим сессиям
 *    bazar_test (через `prisma db execute`, без пакета pg);
 * 2. сам сброс — до 3 попыток с паузой: deadlock в Postgres
 *    транзиентен, повтор проходит на чистых блокировках.
 */
const { execSync } = require('node:child_process');
const { resolve } = require('node:path');
const { applyTestEnv } = require('./neon-env.cjs');

const API_DIR = resolve(__dirname, '../..');
const ATTEMPTS = 3;
const RETRY_PAUSE_MS = 5000;

/** Убить чужие сессии на тестовой БД (pid <> текущий). */
function terminateStaleSessions() {
  const sql =
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity ' +
    'WHERE datname = current_database() AND pid <> pg_backend_pid();';
  execSync('npx prisma db execute --stdin --url "$DATABASE_URL_DIRECT"', {
    cwd: API_DIR,
    input: sql,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
    shell: '/bin/bash',
  });
}

/** Один прогон force-reset; вывод в stdout только при падении. */
function resetSchema() {
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: API_DIR,
    stdio: 'pipe',
    env: { ...process.env },
  });
}

module.exports = async () => {
  applyTestEnv();
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      terminateStaleSessions();
    } catch (e) {
      // Не фатально: если terminate не удался, reset всё равно
      // попытается пройти (может, сессий и не было).
      console.warn(
        `global-setup: pg_terminate_backend не выполнен: ${e.message}`,
      );
    }
    try {
      resetSchema();
      return;
    } catch (e) {
      if (attempt === ATTEMPTS) {
        throw e;
      }
      console.warn(
        `global-setup: db push не удался (попытка ${attempt}/${ATTEMPTS}), ` +
          `повтор через ${RETRY_PAUSE_MS / 1000}s. Причина: ${e.message}`,
      );
      await new Promise((r) => setTimeout(r, RETRY_PAUSE_MS));
    }
  }
};
