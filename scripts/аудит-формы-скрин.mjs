#!/usr/bin/env node
/**
 * Съёмка секции «Формы» витрины /dev/design для VLM-аудита
 * (Промт 12, Часть E; доработка — кадры строго по карточке
 * «Параметры поставки», без утечек соседних секций-стендов).
 * Требует dev-экспорт (dist-dev) на :3000:
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

// Кадры 1–2: строго по границам карточки «Параметры поставки» —
// соседние секции-стенды («Поле ввода», «Карточки», «Бейджи»)
// не должны попадать в кадр: VLM читал их как служебный UI-кит
// в рабочем экране (VLM-аудит доработки).
console.log('шаг: скролл к карточке формы');
const formCard = page.locator('text=Параметры поставки').first();
await formCard.waitFor({ timeout: 10_000 });
await formCard.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
const cardBox = await formCard.boundingBox();
if (!cardBox) {
  throw new Error('карточка формы не найдена');
}
// cardBox — по заголовку внутри карточки; поднимаемся к её верху.
const cardTop = Math.max(0, cardBox.y - 52);
const FRAME_H = 700;
await page.screenshot({
  path: path.join(OUT_DIR, 'forms-1-select-checkbox.png'),
  clip: { x: 0, y: cardTop, width: 390, height: Math.min(FRAME_H, 844) },
});

// Кадр 2: низ карточки — Radio, Switch, DatePicker, «Сохранить».
console.log('шаг: низ формы');
const saveButton = page.getByRole('button', { name: /Сохранить параметры/ });
await saveButton.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
const saveBox = await saveButton.boundingBox();
if (saveBox) {
  const bottom = saveBox.y + saveBox.height + 16;
  await page.screenshot({
    path: path.join(OUT_DIR, 'forms-2-radio-switch.png'),
    clip: {
      x: 0,
      y: Math.max(0, bottom - FRAME_H),
      width: 390,
      height: Math.min(FRAME_H, 844),
    },
  });
} else {
  await page.screenshot({
    path: path.join(OUT_DIR, 'forms-2-radio-switch.png'),
  });
}

// Кадр 3: открытый Select (combobox-шит) поверх формы.
console.log('шаг: открытый Select');
await formCard.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.getByRole('combobox').first().click();
await page.waitForTimeout(800);
await page.screenshot({
  path: path.join(OUT_DIR, 'forms-3-select-open.png'),
});
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
// Закрытие шита тапом по подложке.
await page.mouse.click(195, 100);
await page.waitForTimeout(500);

// Кадр 4: открытый календарь DatePicker (сетка 7×6).
console.log('шаг: открытый DatePicker');
const dateTrigger = page.getByRole('button', {
  name: /Ближайшая дата поставки/,
});
await dateTrigger.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await dateTrigger.click();
await page.waitForTimeout(800);
await page.screenshot({
  path: path.join(OUT_DIR, 'forms-4-datepicker-open.png'),
});
await page.mouse.click(195, 100);
await page.waitForTimeout(400);

// Кадр 5 (бонус): секция типографики витрины.
await page.locator('text=Текст').first().scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT_DIR, 'forms-5-typography.png') });

await browser.close();
console.log('снято в', OUT_DIR);
