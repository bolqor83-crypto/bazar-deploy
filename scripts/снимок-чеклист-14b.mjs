#!/usr/bin/env node
/**
 * Съёмка 18 кадров для чек-листа Промта 14b (§7.2):
 * 3 экрана (каталог, товар, профиль) × 3 viewport (360/390/430) ×
 * 2 темы (light/dark). Живые скриншоты с localhost:3000 — в
 * download/промт14b/чек-лист/<screen>-<theme>-<viewport>.png.
 *
 * Тот же проход, что у golden (логин демо, роль customer,
 * маски, отключение анимаций), но без сравнения.
 *
 * Запуск: node scripts/снимок-чеклист-14b.mjs (сервер :3000 поднят).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {
  disableAnimations,
  applyMasks,
  loginAsDemo,
  switchRole,
} from './visual/screenshot.mjs';

const OUT_DIR = path.resolve(
  process.env.SHOTS_DIR ?? 'download/промт14b/чек-лист',
);
const BASE_URL = process.env.VISUAL_BASE_URL ?? 'http://localhost:3000';

const VIEWPORTS = {
  360: { width: 360, height: 800 },
  390: { width: 390, height: 844 },
  430: { width: 430, height: 932 },
};

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await disableAnimations(page);
  await loginAsDemo(page);
  await switchRole(page, 'Покупатель');

  let productId = '';
  for (const viewport of [390, 360, 430]) {
    for (const theme of ['light', 'dark']) {
      // Каталог.
      await page.setViewportSize(VIEWPORTS[viewport]);
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(`${BASE_URL}/customer/catalog`, {
        waitUntil: 'networkidle',
      });
      await page
        .waitForSelector('[data-testid="catalog-product"]', { timeout: 10_000 })
        .catch(() => {});
      await page.waitForTimeout(600);
      await applyMasks(page);
      await page.screenshot({
        path: path.join(OUT_DIR, `catalog-${theme}-${viewport}.png`),
      });

      // Товар: первый продукт каталога (id один раз).
      if (!productId) {
        const card = page.locator('[data-testid="catalog-product"]').first();
        await card.click();
        await page
          .waitForURL(/\/product\//, { timeout: 10_000 })
          .catch(() => {});
        productId = page.url().split('/').pop() ?? '';
      }
      await page.goto(
        `${BASE_URL}/customer/product/${productId}?v=${viewport}-${theme}`,
        { waitUntil: 'networkidle' },
      );
      await page
        .waitForSelector('[data-testid="product-card"]', { timeout: 10_000 })
        .catch(() => {});
      await page.waitForTimeout(600);
      await applyMasks(page);
      await page.screenshot({
        path: path.join(OUT_DIR, `product-${theme}-${viewport}.png`),
      });

      // Профиль.
      await page.goto(`${BASE_URL}/customer/profile`, {
        waitUntil: 'networkidle',
      });
      await page.waitForTimeout(700);
      await applyMasks(page);
      await page.screenshot({
        path: path.join(OUT_DIR, `profile-${theme}-${viewport}.png`),
      });
      console.log(`снято: ${viewport}/${theme}`);
    }
  }

  await context.close();
  await browser.close();
  console.log(`Готово: ${fs.readdirSync(OUT_DIR).length} кадров в ${OUT_DIR}`);
}

main().catch((e) => {
  console.error('Ошибка:', e.message);
  process.exit(1);
});
