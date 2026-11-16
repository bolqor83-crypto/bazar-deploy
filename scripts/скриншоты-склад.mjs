#!/usr/bin/env node
/**
 * Съёмка экранов склада для поставки Промта 11b.
 *
 * 4 экрана × 3 вьюпорта × 2 темы + состояния (сегменты, поиск без
 * результатов, форма списания с быстрыми причинами, склады) —
 * 30+ файлов в download/промт11b/visual/. Данные — свежий
 * prepareStockGolden (как в golden-прогоне).
 *
 * Запуск: node scripts/скриншоты-склад.mjs (сервер на :3000).
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.VISUAL_BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve('download/промт11b/visual');

const VIEWPORTS = {
  360: { width: 360, height: 800 },
  390: { width: 390, height: 844 },
  430: { width: 430, height: 932 },
};

/** POST/GET к API с токеном Ивана. */
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

async function prepareGoldenOffer() {
  const auth = await api('POST', '/auth/login', {
    body: { phone: '+79001234567', password: 'qwerty123' },
  });
  const token = auth.accessToken;
  const me = await api('GET', '/auth/me', { token });
  const org = me.memberships.find(
    (m) => String(m.role).toUpperCase() === 'WHOLESALE_SELLER',
  )?.organizationId;
  if (!org) throw new Error('нет WHOLESALE_SELLER');
  const offers = await api(
    'GET',
    '/seller/offers?search=%D0%93%D0%BE%D0%BB%D0%B4%D0%B5%D0%BD&pageSize=5',
    { token, org },
  );
  if (offers.items.length === 0) {
    throw new Error(
      '«Голден склад» не найден — запусти golden:update или подготовь вручную',
    );
  }
  return { token, org, offerId: offers.items[0].id };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { offerId } = await prepareGoldenOffer();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  // Логин Ивана (wholesale — приоритетная роль).
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[aria-label="Телефон"]', '+7 (900) 123-45-67');
  await page.fill('input[aria-label="Пароль"]', 'qwerty123');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await page.waitForURL(/wholesale/, { timeout: 20_000 });
  await page.waitForTimeout(1000);

  let counter = 0;
  async function shot(name) {
    counter += 1;
    const file = path.join(
      OUT_DIR,
      `${String(counter).padStart(2, '0')}-${name}.png`,
    );
    fs.writeFileSync(file, await page.screenshot({ fullPage: false }));
    console.info(`${String(counter).padStart(2, '0')} ${name}`);
  }

  async function openOverview(theme, viewport, { search = '' } = {}) {
    await page.emulateMedia({ colorScheme: theme });
    await page.setViewportSize(VIEWPORTS[viewport]);
    await page.goto(`${BASE_URL}/wholesale/stock`, {
      waitUntil: 'networkidle',
    });
    await page
      .waitForSelector('[data-testid="stock-segment-all"]', { timeout: 10_000 })
      .catch(() => {});
    await page.waitForTimeout(600);
    if (search) {
      await page.fill('[data-testid="stock-search"]', search);
      await page.waitForTimeout(1200);
    }
  }

  // --- 1. Обзор: 3 вьюпорта × 2 темы (поиск «Голден» — детерминизм). ---
  for (const theme of ['light', 'dark']) {
    for (const vp of [360, 390, 430]) {
      await openOverview(theme, vp, { search: 'Голден' });
      await shot(`stock-overview-${theme}-${vp}`);
    }
  }

  // --- 2. Состояния обзора (390, light). ---
  await openOverview('light', 390);
  await page.locator('[data-testid="stock-segment-low"]').click();
  await page.waitForTimeout(800);
  await shot('stock-overview-state-segment-low-390');

  await openOverview('light', 390);
  await page.locator('[data-testid="stock-segment-out"]').click();
  await page.waitForTimeout(800);
  await shot('stock-overview-state-segment-out-390');

  await openOverview('light', 390, { search: 'несуществующий товар 000' });
  await shot('stock-overview-state-empty-search-390');

  // --- 3. Детали позиции: 3 × 2. ---
  for (const theme of ['light', 'dark']) {
    for (const vp of [360, 390, 430]) {
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize(VIEWPORTS[vp]);
      await page.goto(`${BASE_URL}/wholesale/stock/${offerId}`, {
        waitUntil: 'networkidle',
      });
      await page
        .waitForSelector('[data-testid^="movement-"]', { timeout: 10_000 })
        .catch(() => {});
      await page.waitForTimeout(800);
      await shot(`stock-detail-${theme}-${vp}`);
    }
  }

  // --- 4. Форма движения (RECEIPT): 3 × 2. ---
  for (const theme of ['light', 'dark']) {
    for (const vp of [360, 390, 430]) {
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize(VIEWPORTS[vp]);
      await page.goto(
        `${BASE_URL}/wholesale/stock/${offerId}/movement?type=RECEIPT`,
        { waitUntil: 'networkidle' },
      );
      await page
        .waitForSelector('[data-testid="movement-save"]', { timeout: 10_000 })
        .catch(() => {});
      await page.waitForTimeout(800);
      await shot(`stock-movement-form-${theme}-${vp}`);
    }
  }

  // --- 5. Форма списания с быстрыми причинами (390, light). ---
  await page.goto(
    `${BASE_URL}/wholesale/stock/${offerId}/movement?type=WRITE_OFF`,
    { waitUntil: 'networkidle' },
  );
  await page.waitForSelector('[data-testid="movement-save"]').catch(() => {});
  await page.waitForTimeout(800);
  await shot('stock-writeoff-form-state-390');

  // --- 6. Форма перемещения: 3 × 2. ---
  for (const theme of ['light', 'dark']) {
    for (const vp of [360, 390, 430]) {
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize(VIEWPORTS[vp]);
      await page.goto(`${BASE_URL}/wholesale/stock/${offerId}/transfer`, {
        waitUntil: 'networkidle',
      });
      await page
        .waitForSelector('[data-testid="transfer-save"]', { timeout: 10_000 })
        .catch(() => {});
      await page.waitForTimeout(800);
      await shot(`stock-transfer-form-${theme}-${vp}`);
    }
  }

  // --- 7. Склады: light/dark 390. ---
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    await page.setViewportSize(VIEWPORTS[390]);
    await page.goto(`${BASE_URL}/wholesale/stock/locations`, {
      waitUntil: 'networkidle',
    });
    await page
      .waitForSelector('[data-testid^="location-"]', { timeout: 10_000 })
      .catch(() => {});
    await page.waitForTimeout(800);
    await shot(`stock-locations-${theme}-390`);
  }

  await browser.close();
  console.info(`\nИтог: ${counter} скриншотов в ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(`Скриншоты склада: ${error.message}`);
  process.exitCode = 1;
});
