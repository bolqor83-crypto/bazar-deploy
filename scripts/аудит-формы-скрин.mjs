#!/usr/bin/env node
/**
 * Съёмка секции «Формы» витрины /dev/design для VLM-аудита
 * (Промт 12, итерация 3). Три кадра:
 *   forms-1-full.png            — карточка «Параметры поставки» целиком
 *                                  (точный clip по границам карточки:
 *                                  соседние секции-стенды не попадают
 *                                  в кадр — VLM читал их как UI-кит);
 *   forms-2-select-open.png     — открытый Select (нижний шит);
 *   forms-3-datepicker-open.png — открытый календарь DatePicker.
 * Требует dev-экспорт (dist-dev) на :3002:
 * pnpm --filter mobile exec expo export --platform web --dev --output-dir dist-dev
 * Запуск: VISUAL_BASE_URL=http://localhost:3002 node scripts/аудит-формы-скрин.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.VISUAL_BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve('download/промт12/audit');
fs.mkdirSync(OUT_DIR, { recursive: true });

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

console.log('шаг: витрина (гость)');
await page.goto(`${BASE_URL}/dev/design`, {
  waitUntil: 'domcontentloaded',
  timeout: 60_000,
});
await page.waitForSelector('text=Дизайн-система', { timeout: 30_000 });
await page.waitForTimeout(1500);
console.log('шаг: витрина открыта');

// Кадр 1: карточка целиком — скролл к началу карточки и clip по
// её фактическим границам (заголовок → кнопка «Сохранить»).
const formTitle = page.locator('text=Параметры поставки').first();
await formTitle.waitFor({ timeout: 15_000 });
await formTitle.evaluate((el) => el.scrollIntoView({ block: 'start' }));
await page.waitForTimeout(700);
const titleBox = await formTitle.boundingBox();
if (!titleBox) throw new Error('карточка формы не найдена');
const saveButton = page.getByRole('button', { name: /Сохранить параметры/ });
await saveButton.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const saveBox = await saveButton.boundingBox();
if (!saveBox) throw new Error('кнопка сохранения не найдена');
// Карточка: padding md (12) + граница; берём запас 14 сверху/снизу.
const top = Math.max(0, titleBox.y - 14);
const bottom = saveBox.y + saveBox.height + 14;
await page.screenshot({
  path: path.join(OUT_DIR, 'forms-1-full.png'),
  clip: { x: 0, y: top, width: 390, height: bottom - top },
});
console.log(`кадр 1: карточка ${Math.round(bottom - top)}px`);

// Кадр 2: открытый Select (нижний шит поверх формы).
await formTitle.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.getByRole('combobox').first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT_DIR, 'forms-2-select-open.png') });
console.log('кадр 2: select открыт');

// Кадр 3: перезагрузка — чистое состояние без шита Select
// (Escape шит не закрывает, оверлей перехватывал клики).
await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForSelector('text=Дизайн-система', { timeout: 30_000 });
await page.waitForTimeout(1500);

// Кадр 3: открытый календарь DatePicker (сетка 7×6).
const dateTrigger = page.getByRole('button', {
  name: /Ближайшая дата поставки/,
});
await dateTrigger.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await dateTrigger.click();
await page.waitForTimeout(900);
await page.screenshot({
  path: path.join(OUT_DIR, 'forms-3-datepicker-open.png'),
});
console.log('кадр 3: datepicker открыт');

await browser.close();
console.log('снято в', OUT_DIR);
