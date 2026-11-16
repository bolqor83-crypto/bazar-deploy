#!/usr/bin/env node
/**
 * Съёмка экранов склада для VLM-аудита Промта 11b (после правок).
 *
 * Обзор — с полными данными (без поиска: плотность реального
 * списка), поля ввода сняты с фокуса (фокус-бордер не попадает
 * в кадр). 390×844, light.
 *
 * Запуск: node scripts/скриншоты-склад-аудит.mjs (сервер на :3000).
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.VISUAL_BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve('download/промт11b/audit');

async function api(method, apiPath, { token, org, body } = {}) {
  const res = await fetch(`${BASE_URL}/api${apiPath}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(org ? { 'X-Organization-Id': org } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `${method} ${apiPath}: ${res.status} ${text.slice(0, 150)}`,
    );
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const auth = await api('POST', '/auth/login', {
    body: { phone: '+79001234567', password: 'qwerty123' },
  });
  const me = await api('GET', '/auth/me', { token: auth.accessToken });
  const org = me.memberships.find(
    (m) => String(m.role).toUpperCase() === 'WHOLESALE_SELLER',
  )?.organizationId;
  const offers = await api(
    'GET',
    '/seller/offers?search=%D0%93%D0%BE%D0%BB%D0%B4%D0%B5%D0%BD&pageSize=5',
    { token: auth.accessToken, org },
  );
  if (offers.items.length === 0) {
    throw new Error('«Голден склад» не найден');
  }
  const offerId = offers.items[0].id;

  const browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: 'light' });

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[aria-label="Телефон"]', '+7 (900) 123-45-67');
  await page.fill('input[aria-label="Пароль"]', 'qwerty123');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await page.waitForURL(/wholesale/, { timeout: 20_000 });
  await page.waitForTimeout(1000);

  const blur = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      if (el && typeof el.blur === 'function') {
        el.blur();
      }
    });

  // 1. Обзор — полный список (без поиска).
  await page.goto(`${BASE_URL}/wholesale/stock`, { waitUntil: 'networkidle' });
  await page
    .waitForSelector('[data-testid^="stock-row-"]', { timeout: 10_000 })
    .catch(() => {});
  await page.waitForTimeout(1200);
  await blur();
  await page.waitForTimeout(200);
  fs.writeFileSync(
    path.join(OUT_DIR, 'screen-overview.png'),
    await page.screenshot(),
  );
  console.info('01 overview');

  // 2. Детали позиции.
  await page.goto(`${BASE_URL}/wholesale/stock/${offerId}`, {
    waitUntil: 'networkidle',
  });
  await page
    .waitForSelector('[data-testid^="movement-"]', { timeout: 10_000 })
    .catch(() => {});
  await page.waitForTimeout(1000);
  fs.writeFileSync(
    path.join(OUT_DIR, 'screen-detail.png'),
    await page.screenshot(),
  );
  console.info('02 detail');

  // 3. Форма прихода.
  await page.goto(
    `${BASE_URL}/wholesale/stock/${offerId}/movement?type=RECEIPT`,
    { waitUntil: 'networkidle' },
  );
  await page.waitForSelector('[data-testid="movement-save"]').catch(() => {});
  await page.waitForTimeout(1000);
  await blur();
  fs.writeFileSync(
    path.join(OUT_DIR, 'screen-movement.png'),
    await page.screenshot(),
  );
  console.info('03 movement');

  // 4. Форма перемещения.
  await page.goto(`${BASE_URL}/wholesale/stock/${offerId}/transfer`, {
    waitUntil: 'networkidle',
  });
  await page.waitForSelector('[data-testid="transfer-save"]').catch(() => {});
  await page.waitForTimeout(1000);
  await blur();
  fs.writeFileSync(
    path.join(OUT_DIR, 'screen-transfer.png'),
    await page.screenshot(),
  );
  console.info('04 transfer');

  // 5. Вторые кадры состояний (для критерия states).
  // Обзор: пустой результат поиска.
  await page.goto(`${BASE_URL}/wholesale/stock`, { waitUntil: 'networkidle' });
  await page
    .waitForSelector('[data-testid^="stock-row-"]', { timeout: 10_000 })
    .catch(() => {});
  await page.fill('[data-testid="stock-search"]', 'несуществующий товар 000');
  await page.waitForTimeout(1500);
  await blur();
  await page.waitForTimeout(200);
  fs.writeFileSync(
    path.join(OUT_DIR, 'screen-overview-2.png'),
    await page.screenshot(),
  );
  console.info('05 overview-2 (empty)');

  // Детали: состояние «нет движений» (позиция без остатка).
  const emptyOffers = await api(
    'GET',
    '/seller/offers?search=%D0%93%D0%BE%D0%BB%D0%B4%D0%B5%D0%BD%20%D0%BF%D1%83%D1%81%D1%82%D0%BE&pageSize=5',
    { token: auth.accessToken, org },
  );
  if (emptyOffers.items.length > 0) {
    await page.goto(`${BASE_URL}/wholesale/stock/${emptyOffers.items[0].id}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(1200);
    fs.writeFileSync(
      path.join(OUT_DIR, 'screen-detail-2.png'),
      await page.screenshot(),
    );
    console.info('06 detail-2 (empty journal)');
  } else {
    console.info('06 detail-2: пустой позиции нет — пропуск');
  }

  // Форма списания с быстрыми причинами.
  await page.goto(
    `${BASE_URL}/wholesale/stock/${offerId}/movement?type=WRITE_OFF`,
    { waitUntil: 'networkidle' },
  );
  await page.waitForSelector('[data-testid="movement-save"]').catch(() => {});
  await page.waitForTimeout(1000);
  await blur();
  fs.writeFileSync(
    path.join(OUT_DIR, 'screen-movement-2.png'),
    await page.screenshot(),
  );
  console.info('07 movement-2 (writeoff)');

  // Перемещение с заполненным количеством.
  await page.goto(`${BASE_URL}/wholesale/stock/${offerId}/transfer`, {
    waitUntil: 'networkidle',
  });
  await page.waitForSelector('[data-testid="transfer-save"]').catch(() => {});
  await page.fill('[data-testid="transfer-quantity"]', '30');
  await page.fill('[data-testid="transfer-reason"]', 'Развоз по точке');
  await page.waitForTimeout(600);
  await blur();
  await page.waitForTimeout(200);
  fs.writeFileSync(
    path.join(OUT_DIR, 'screen-transfer-2.png'),
    await page.screenshot(),
  );
  console.info('08 transfer-2 (filled)');

  await browser.close();
  console.info(`Итог: 8 аудиторских скриншотов в ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(`Аудит-скриншоты: ${error.message}`);
  process.exitCode = 1;
});
