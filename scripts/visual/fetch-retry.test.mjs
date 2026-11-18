/**
 * Тесты fetchWithRetry (Промт 14b, часть E): мок fetch — первый
 * ответ 500, второй 200; 4xx не ретраится; сетевые ошибки ретраятся;
 * исчерпание попыток возвращает последний 5xx.
 *
 * Запуск: node --test scripts/visual/fetch-retry.test.mjs
 * (без сервера и БД — чистые моки, миллисекунды).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchWithRetry, retryStats } from './fetch-retry.mjs';

/** Мгновенный backoff — тест не ждёт реальных пауз. */
const FAST = { backoffMs: [1, 1, 1] };

/** Response-заглушка. */
const res = (status) => ({ status });

test('первый 500, второй 200 — ретрай спасает запрос', async () => {
  const calls = [];
  const fetchImpl = async () => {
    calls.push(calls.length);
    return res(calls.length === 1 ? 500 : 200);
  };
  const response = await fetchWithRetry(
    'http://x/api/orders',
    {},
    { ...FAST, fetchImpl },
  );
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2, 'ровно два вызова: 500 → 200');
});

test('404 не ретраится — один вызов', async () => {
  const calls = [];
  const fetchImpl = async () => {
    calls.push(1);
    return res(404);
  };
  const response = await fetchWithRetry(
    'http://x/api/orders/nope',
    {},
    { ...FAST, fetchImpl },
  );
  assert.equal(response.status, 404);
  assert.equal(calls.length, 1, '4xx не должен ретраиться');
});

test('401 не ретраится — один вызов', async () => {
  const calls = [];
  const fetchImpl = async () => {
    calls.push(1);
    return res(401);
  };
  await fetchWithRetry('http://x/api/auth/me', {}, { ...FAST, fetchImpl });
  assert.equal(calls.length, 1);
});

test('сетевая ошибка ретраится и спасается вторым ответом', async () => {
  const calls = [];
  const fetchImpl = async () => {
    calls.push(calls.length);
    if (calls.length === 1) {
      throw new TypeError('fetch failed');
    }
    return res(200);
  };
  const response = await fetchWithRetry(
    'http://x/api/cart',
    {},
    { ...FAST, fetchImpl },
  );
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
});

test('постоянный 500 — 4 вызова (1 + 3 ретрая), возвращён последний 5xx', async () => {
  const calls = [];
  const fetchImpl = async () => {
    calls.push(1);
    return res(500);
  };
  const response = await fetchWithRetry(
    'http://x/api/orders',
    {},
    { ...FAST, fetchImpl },
  );
  assert.equal(response.status, 500, 'после исчерпания — последний ответ');
  assert.equal(calls.length, 4, '1 вызов + 3 ретрая (backoff 500мс → 1с → 2с)');
});

test('статистика ретраев ведётся', async () => {
  const before = {
    attempts: retryStats.attempts,
    status503: retryStats.byStatus['503'] ?? 0,
  };
  const fetchImpl = async () => res(503);
  await fetchWithRetry('http://x/api/health', {}, { ...FAST, fetchImpl });
  assert.ok(retryStats.attempts > before.attempts, 'счётчик попыток растёт');
  assert.ok(
    (retryStats.byStatus['503'] ?? 0) >= before.status503 + 4,
    '503 учтён по числу попыток',
  );
});
