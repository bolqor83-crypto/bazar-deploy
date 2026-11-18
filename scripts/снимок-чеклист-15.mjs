#!/usr/bin/env node
/**
 * Съёмка кадров чек-листа Промта 15 (16 критериев, 24 кадра):
 * цветные иконки, StockDot, компактная карточка, сетка 2/3,
 * SortPicker compact, группировка заказов по контрагенту.
 *
 * Режимы (argv[2]):
 *   before — 5 кадров «до» с прода (14b) для сравнения до/после;
 *   full   — 24 кадра чек-листа (после деплоя / с локали).
 *
 * Запуск:
 *   VISUAL_BASE_URL=http://localhost:3000 \
 *   SHOTS_DIR=download/промт15/чек-лист \
 *   node scripts/снимок-чеклист-15.mjs full
 *
 * Тот же проход, что у golden (логин демо, роли через ContextSheet,
 * маски, отключение анимаций), но без сравнения. На «до»-проде
 * (14b) новых testID нет — все ожидания мягкие (catch).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {
  BASE_URL,
  disableAnimations,
  applyMasks,
  loginAsDemo,
  switchRole,
} from './visual/screenshot.mjs';

const OUT_DIR = path.resolve(
  process.env.SHOTS_DIR ?? 'download/промт15/чек-лист',
);
const MODE = process.argv[2] ?? 'full';

const VIEWPORTS = {
  360: { width: 360, height: 800 },
  390: { width: 390, height: 844 },
  430: { width: 430, height: 932 },
  768: { width: 768, height: 1024 },
};

async function shot(page, name) {
  await applyMasks(page);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log(`снято: ${name}`);
}

/** Каталог в теме/вьюпорте; viewMode заказа — нетронут. */
async function catalog(page, theme, viewport) {
  await page.setViewportSize(VIEWPORTS[viewport]);
  await page.emulateMedia({ colorScheme: theme });
  await page.goto(`${BASE_URL}/customer/catalog`, {
    waitUntil: 'networkidle',
  });
  await page
    .waitForSelector('[data-testid="catalog-product"]', { timeout: 10_000 })
    .catch(() => {});
  await page.waitForTimeout(600);
}

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

  if (MODE === 'before') {
    // === «До»: прод на 14b, ключевые экраны для сравнения ===
    await switchRole(page, 'Покупатель');
    for (const [theme, vp] of [
      ['light', 390],
      ['dark', 390],
    ]) {
      await catalog(page, theme, vp);
      await shot(page, `catalog-${theme}-${vp}`);
    }
    await page.goto(`${BASE_URL}/customer/orders`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(800);
    await shot(page, 'orders-light-390');
    await page.goto(`${BASE_URL}/customer/more`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(800);
    await shot(page, 'tools-more-light-390');
    // Контекст-шит с ролями (на /more шапки нет — уходим в каталог).
    await page.goto(`${BASE_URL}/customer/catalog`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(600);
    await page.locator('[aria-label*="Контекст"]').first().click();
    await page.waitForTimeout(700);
    await shot(page, 'context-sheet-light-390');
  } else {
    // === Полный чек-лист: 24 кадра ===
    await switchRole(page, 'Покупатель');

    // 1–6: каталог — сетка, StockDot, компактная карточка.
    for (const [theme, vp] of [
      ['light', 390],
      ['dark', 390],
      ['light', 360],
      ['light', 430],
      ['light', 768],
      ['dark', 768],
    ]) {
      await catalog(page, theme, vp);
      await shot(page, `catalog-${theme}-${vp}`);
    }

    // 7: SortPicker compact — открытый список сортировки.
    await catalog(page, 'light', 390);
    await page.locator('[aria-label^="Сортировка:"]').first().click();
    await page.waitForTimeout(500);
    await shot(page, 'catalog-sort-open-light-390');

    // 8–10: карточка товара — текст наличия (StockIndicator) на месте.
    let productId = '';
    const card = page.locator('[data-testid="catalog-product"]').first();
    await card.click({ position: { x: 30, y: 100 } });
    await page.waitForURL(/\/product\//, { timeout: 10_000 }).catch(() => {});
    productId = page.url().split('/').pop() ?? '';
    for (const [theme, vp] of [
      ['light', 390],
      ['dark', 390],
      ['light', 360],
    ]) {
      await page.setViewportSize(VIEWPORTS[vp]);
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(
        `${BASE_URL}/customer/product/${productId}?v=${vp}-${theme}`,
        { waitUntil: 'networkidle' },
      );
      await page
        .waitForSelector('[data-testid="product-card"]', { timeout: 10_000 })
        .catch(() => {});
      await page.waitForTimeout(600);
      await shot(page, `product-${theme}-${vp}`);
    }

    // 11–15: заказы покупателя — группировка.
    for (const [theme, vp] of [
      ['light', 390],
      ['dark', 390],
      ['light', 430],
    ]) {
      await page.setViewportSize(VIEWPORTS[vp]);
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(`${BASE_URL}/customer/orders`, {
        waitUntil: 'networkidle',
      });
      await page
        .waitForSelector('[data-testid="orders-group-0-header"]', {
          timeout: 10_000,
        })
        .catch(() => {});
      await page.waitForTimeout(600);
      await shot(page, `orders-grouped-${theme}-${vp}`);
    }

    // 12: свёрнутая группа — клик по заголовку первой.
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize(VIEWPORTS[390]);
    await page.goto(`${BASE_URL}/customer/orders`, {
      waitUntil: 'networkidle',
    });
    await page
      .waitForSelector('[data-testid="orders-group-0-header"]', {
        timeout: 10_000,
      })
      .catch(() => {});
    await page.waitForTimeout(500);
    await page
      .locator('[data-testid="orders-group-0-header"]')
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(600);
    await shot(page, 'orders-collapsed-light-390');

    // 13: «По дате» — плоская хронология (регрессия закрыта).
    await page
      .locator('[data-testid="orders-view-mode"]')
      .getByText('По дате')
      .click()
      .catch(async () => {
        await page.getByText('По дате', { exact: true }).click();
      });
    await page.waitForTimeout(800);
    await shot(page, 'orders-chronological-light-390');

    // Вернуть «По продавцам» (персист: не портить прод-состояние демо).
    await page
      .locator('[data-testid="orders-view-mode"]')
      .getByText('По продавцам')
      .click()
      .catch(() => {});

    // 16–17: оптовик — группы по покупателям.
    await switchRole(page, 'Оптовик');
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize(VIEWPORTS[390]);
      await page.goto(`${BASE_URL}/wholesale/orders`, {
        waitUntil: 'networkidle',
      });
      await page
        .locator('[data-testid="seller-orders-filter-all"]')
        .first()
        .click()
        .catch(() => {});
      await page.waitForTimeout(1200);
      await shot(page, `seller-orders-grouped-${theme}-390`);
    }

    // 18: владелец точки — группировка.
    await switchRole(page, 'Владелец точки');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(`${BASE_URL}/store/orders`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(900);
    await shot(page, 'store-orders-grouped-light-390');

    // 19–20: «Все инструменты» — цветные иконки инструментов.
    await switchRole(page, 'Покупатель');
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(`${BASE_URL}/customer/more`, {
        waitUntil: 'networkidle',
      });
      await page.waitForTimeout(700);
      await shot(page, `tools-more-${theme}-390`);
    }

    // 21–22: контекст-шит — цветные иконки ролей.
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(`${BASE_URL}/customer/catalog`, {
        waitUntil: 'networkidle',
      });
      await page.waitForTimeout(500);
      await page.locator('[aria-label*="Контекст"]').first().click();
      await page.waitForTimeout(700);
      await shot(page, `context-sheet-${theme}-390`);
      await page.keyboard.press('Escape').catch(() => {});
      await page
        .getByText('Применить', { exact: true })
        .click()
        .catch(() => {});
      await page.waitForTimeout(400);
    }

    // 23: склад оптовика — рабочие экраны не сломаны.
    await switchRole(page, 'Оптовик');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(`${BASE_URL}/wholesale/stock`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(900);
    await shot(page, 'stock-overview-light-390');

    // 24: профиль покупателя.
    await switchRole(page, 'Покупатель');
    await page.goto(`${BASE_URL}/customer/profile`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(700);
    await shot(page, 'profile-customer-light-390');
  }

  await context.close();
  await browser.close();
  console.log(
    `Готово (${MODE}): ${fs.readdirSync(OUT_DIR).length} кадров в ${OUT_DIR}`,
  );
}

main().catch((e) => {
  console.error('Ошибка:', e.message);
  process.exit(1);
});
