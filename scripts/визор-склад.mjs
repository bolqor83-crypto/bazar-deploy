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

// Склад: обзор, light и dark.
await page.emulateMedia({ colorScheme: 'light' });
await page.goto(`${BASE_URL}/wholesale/stock`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT_DIR, 'stock-overview-light.png') });

await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT_DIR, 'stock-overview-dark.png') });

// Детали первой позиции.
await page.emulateMedia({ colorScheme: 'light' });
const firstRow = page.locator('[data-testid^="stock-row-"]').first();
if (await firstRow.count()) {
  await firstRow.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, 'stock-detail-light.png') });
  const url = page.url();
  // Форма движения от этой же позиции.
  await page.goto(`${url}/movement?type=RECEIPT`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(OUT_DIR, 'stock-movement-light.png'),
  });
} else {
  console.log('строки не найдены — пустой склад?');
}

await browser.close();
console.log('снято в', OUT_DIR);
