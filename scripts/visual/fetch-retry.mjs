/**
 * fetch с ретраями для prepare-фазы pixelmatch (Промт 14b).
 *
 * Закрывает долг: транзиентные 500/502/503/504 от Neon (и сетевые
 * срывы) роняли прогон целиком — второй раз подряд (Промт 12,
 * Промт 14a). Теперь: до 3 ретраев после первого вызова (итого до
 * 4 попыток — задействованы все паусы 500мс → 1с → 2с из ТЗ),
 * ретрай ТОЛЬКО на 5xx/сетевых ошибках (не на 401/403/400/404),
 * каждая попытка логируется, статистика собирается для отчёта.
 *
 * Модуль независим от screenshot.mjs и покрывается тестом
 * fetch-retry.test.mjs (node --test, мок fetch).
 */

/** Статистика ретраев текущего процесса (для отчёта). */
export const retryStats = {
  attempts: 0,
  retries: 0,
  recovered: 0,
  exhausted: 0,
  byStatus: {},
};

/** Коды, на которые ретрай имеет смысл (транзиентные). */
const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

/** Паузы между попытками: 500мс → 1с → 2с. */
const BACKOFF_MS = [500, 1000, 2000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Краткий путь URL для логов: /api/orders → /api/orders. */
function label(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

/**
 * fetch с ретраями. Возвращает Response (как обычный fetch).
 * Бросает ошибку только после исчерпания всех попыток.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {{ fetchImpl?: typeof fetch, backoffMs?: number[] }} [deps]
 *   для тестов: подмена fetch и мгновенный backoff.
 */
export async function fetchWithRetry(url, options = {}, deps = {}) {
  const doFetch = deps.fetchImpl ?? globalThis.fetch;
  const backoff = deps.backoffMs ?? BACKOFF_MS;
  const maxAttempts = backoff.length + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    retryStats.attempts += 1;
    let response;
    try {
      response = await doFetch(url, options);
    } catch (error) {
      // Сетевой сбой (ECONNRESET, fetch failed, timeout) —
      // ретраебельно.
      if (attempt < maxAttempts) {
        retryStats.retries += 1;
        console.warn(
          `retry ${label(url)}: попытка ${attempt} — сетевая ошибка ` +
            `(${error.message}), повтор через ${backoff[attempt - 1]}мс`,
        );
        await sleep(backoff[attempt - 1]);
        continue;
      }
      retryStats.exhausted += 1;
      throw error;
    }

    if (!RETRYABLE_STATUS.has(response.status)) {
      if (attempt > 1) {
        retryStats.recovered += 1;
      }
      return response;
    }

    // 500/502/503/504: транзиентная ошибка сервера/БД.
    if (attempt < maxAttempts) {
      retryStats.retries += 1;
      const key = String(response.status);
      retryStats.byStatus[key] = (retryStats.byStatus[key] ?? 0) + 1;
      console.warn(
        `retry ${label(url)}: попытка ${attempt} → ${response.status}, ` +
          `повтор через ${backoff[attempt - 1]}мс`,
      );
      await sleep(backoff[attempt - 1]);
      continue;
    }

    retryStats.exhausted += 1;
    const key = String(response.status);
    retryStats.byStatus[key] = (retryStats.byStatus[key] ?? 0) + 1;
    console.warn(
      `retry ${label(url)}: попытка ${attempt} → ${response.status} — ` +
        `исчерпаны ${maxAttempts} попытки`,
    );
    return response;
  }

  // Недостижимо: цикл всегда возвращает или бросает.
  throw new Error('unreachable');
}

/** Итоговая сводка для лога прогона. */
export function retryReport() {
  const statuses = Object.entries(retryStats.byStatus)
    .map(([code, n]) => `${code}×${n}`)
    .join(', ');
  return (
    `retry: попыток ${retryStats.attempts}, ретраев ${retryStats.retries}` +
    ` (восстановлено ${retryStats.recovered}, исчерпано ${retryStats.exhausted})` +
    (statuses ? `, по статусам: ${statuses}` : '')
  );
}
