#!/usr/bin/env node
/**
 * Быстрая визуальная проверка новой вёрстки склада (Промт 12, Часть A).
 * Логин демо-пользователем → склад (light/dark) + форма движения.
 * Запуск: node scripts/визор-склад.mjs (сервер на :3000).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.VISUAL_BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve('download/промт12/preview');
fs.mkdirSync(OUT_DIR, { recursive: true });

const DEMO_PHONE = '+7 (900) 123-45-67';
const DEMO_PASSWORD = 'qwerty123';

async function loginAsDemo(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[aria-label="Телефон"]', DEMO_PHONE);
  await page.fill('input[aria-label="Пароль"]', DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await page.waitForURL(/wholesale|store|customer|carrier|welcome/, {
    timeout: 20_000,
  });
  await page.waitForTimeout(800);
}

async function switchRole(page, roleLabel) {
  await page.locator('[aria-label*="Контекст"]').first().click();
  await page
    .getByText('Текущий выбор', { exact: false })
    .waitFor({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(300);
  const roleChip = page.locator(`[aria-label="${roleLabel}"]`).first();
  await roleChip.click();
  await page.waitForTimeout(300);
  await page.getByText('Применить', { exact: true }).click();
  await page.waitForTimeout(1200);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
await page.addInitScript(() => {
  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      caret-color: transparent !important;
    }
  `;
  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(style);
  });
});

await loginAsDemo(page);
await switchRole(page, 'Оптовик');

// Детали позиции «Голден склад»: у неё детерминированные 5 движений
// в журнале — кадр деталей не «пустеет» после первой записи
// (VLM-аудит доработки).
async function goldenOfferId() {
  const auth = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '+79001234567',
      password: 'qwerty123',
    }),
  }).then((r) => r.json());
  const me = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  }).then((r) => r.json());
  const org = me.memberships.find(
    (m) => String(m.role).toUpperCase() === 'WHOLESALE_SELLER',
  )?.organizationId;
  const offers = await fetch(
    `${BASE_URL}/api/seller/offers?search=${encodeURIComponent('Голден')}&pageSize=5`,
    {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'X-Organization-Id': org,
      },
    },
  ).then((r) => r.json());
  return offers.items[0]?.id ?? null;
}

const detailOfferId = (await goldenOfferId()) ?? null;

// Склад: обзор, light и dark.
await page.emulateMedia({ colorScheme: 'light' });
await page.goto(`${BASE_URL}/wholesale/stock`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT_DIR, 'stock-overview-light.png') });

await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT_DIR, 'stock-overview-dark.png') });

// Детали позиции (Голден — полный журнал) и форма движения от неё.
await page.emulateMedia({ colorScheme: 'light' });
const detailUrl = detailOfferId
  ? `${BASE_URL}/wholesale/stock/${detailOfferId}`
  : page.url();
await page.goto(detailUrl, { waitUntil: 'networkidle' });
await page
  .waitForSelector('[data-testid^="movement-"]', { timeout: 15_000 })
  .catch(() => {});
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(OUT_DIR, 'stock-detail-light.png') });
// Форма движения от этой же позиции.
await page.goto(`${detailUrl}/movement?type=RECEIPT`, {
  waitUntil: 'networkidle',
});
await page.waitForTimeout(1500);
await page.screenshot({
  path: path.join(OUT_DIR, 'stock-movement-light.png'),
});

await browser.close();
console.log('снято в', OUT_DIR);
