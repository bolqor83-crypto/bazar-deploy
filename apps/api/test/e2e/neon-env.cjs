/**
 * Общий ENV-хелпер e2e-тестов (Промт 9, Часть A).
 *
 * Тесты работают на PostgreSQL (Neon, база bazar_test в проекте
 * bazar-demo). URI берутся из окружения или из apps/api/.env;
 * путь БД заменяется на bazar_test, чтобы не трогать демо-данные.
 *
 * Интерактивные $transaction в тестах требуют direct-подключения
 * (PgBouncer их не пропускает) — см. ADR 0010.
 */
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

/** Мини-парсер .env (без внешних пакетов). */
function readDotEnv() {
  const file = resolve(__dirname, '../../.env');
  try {
    const out = {};
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^"|"$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}

/** Заменить базу в URI на bazar_test. */
function toTestDb(uri) {
  return typeof uri === 'string'
    ? uri.replace(/\/neondb(\?|$)/, '/bazar_test$1')
    : uri;
}

/** Применить тестовое окружение (вызывать до импорта приложения). */
function applyTestEnv() {
  const dotenv = readDotEnv();
  const get = (name) => process.env[name] ?? dotenv[name];
  const direct = toTestDb(
    get('TEST_DATABASE_URL_DIRECT') ?? get('DATABASE_URL_DIRECT'),
  );
  const pooled = toTestDb(
    get('TEST_DATABASE_URL_POOLED') ?? get('DATABASE_URL_POOLED'),
  );
  if (direct) process.env.DATABASE_URL_DIRECT = direct;
  if (pooled) process.env.DATABASE_URL_POOLED = pooled;
  if (!process.env.DATABASE_URL_DIRECT) {
    throw new Error(
      'e2e: не задан DATABASE_URL_DIRECT (PostgreSQL/Neon — Промт 9)',
    );
  }
}

module.exports = { applyTestEnv, toTestDb };
