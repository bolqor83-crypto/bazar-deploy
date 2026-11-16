#!/usr/bin/env node
/**
 * Съёмка секции «Формы» витрины /dev/design для VLM-аудита
 * (Промт 12, Часть E). Требует dev-экспорт (dist-dev) на :3000:
 * pnpm --filter mobile exec expo export --platform web --dev --output-dir dist-dev
 *
 * Запуск: node scripts/аудит-формы-скрин.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.VISUAL_BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve('download/промт12/audit');
fs.mkdirSync(OUT_DIR, { recursive: true });

const DEMO_PHONE = '+7 (900) 123-45-67';
const DEMO_PASSWORD = 'qwerty123';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
await page.emulateMedia({ colorScheme: 'light' });
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

// Витрина — гостевая зона (AuthGuard requireAuth:false
// редиректит залогиненных): заходим без сессии.
console.log('шаг: витрина (гость)');
await page.goto(`${BASE_URL}/dev/design`, { waitUntil: 'networkidle' });
await page.waitForSelector('text=Дизайн-система', { timeout: 15_000 });
console.log('шаг: витрина открыта');
await page.waitForTimeout(1200);

// Прокрутка к секции «Формы».
console.log('шаг: скролл к Формам');
const formsHeader = page.locator('text=Формы').first();
await formsHeader.scrollIntoViewIfNeeded({ timeout: 10_000 });
console.log('шаг: прокрутили');
await page.waitForTimeout(600);
await page.screenshot({
  path: path.join(OUT_DIR, 'forms-1-select-checkbox.png'),
});

// Ниже: Radio, Switch, DatePicker (триггеры).
await page.mouse.wheel(0, 420);
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT_DIR, 'forms-2-radio-switch.png') });

// Открытый Select (combobox-шит).
await page.mouse.wheel(0, -420);
await page.waitForTimeout(400);
await page.getByRole('combobox').first().click();
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(OUT_DIR, 'forms-3-select-open.png') });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
// Закрытие шита тапом по подложке.
await page.mouse.click(195, 100);
await page.waitForTimeout(500);

// Открытый календарь DatePicker.
await page.getByRole('button', { name: /Дата поставки/ }).click();
await page.waitForTimeout(800);
await page.screenshot({
  path: path.join(OUT_DIR, 'forms-4-datepicker-open.png'),
});
await page.mouse.click(195, 100);
await page.waitForTimeout(400);

// Секция текста (типографика витрины).
await page.locator('text=Текст').first().scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT_DIR, 'forms-5-typography.png') });

await browser.close();
console.log('снято в', OUT_DIR);
