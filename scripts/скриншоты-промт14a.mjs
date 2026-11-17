#!/usr/bin/env node
/**
 * Скриншоты Промта 14a: карточка товара с каруселью похожих.
 *
 * Кадры чек-листа §7: light/dark × 360/390/430 + свайп-состояние
 * карусели. Аутентификация — демо-логин Ивана (как в golden).
 * Сервер: http://localhost:3000 (запускать в одном bash-вызове
 * с сервером).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.VISUAL_BASE_URL ?? 'http://localhost:3000';
const OUT = path.resolve('download/промт14a');

const VIEWPORTS = {
  360: { width: 360, height: 800 },
  390: { width: 390, height: 844 },
  430: { width: 430, height: 932 },
};

const DEMO_PHONE = '+7 (900) 123-45-67';
const DEMO_PASSWORD = 'qwerty123';

/** Переключить активную роль через ContextSheet (как в golden). */
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

async function scrollToCarousel(page) {
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="carousel-scroll"]');
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  });
  await page.waitForTimeout(500);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const [theme, scheme] of [
    ['light', 'light'],
    ['dark', 'dark'],
  ]) {
    for (const [name, vp] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({
        viewport: vp,
        colorScheme: scheme,
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

      // Логин Ивана → переключение на роль «Покупатель» (после
      // логина активен оптовик — приоритет членств, ADR 0004).
      await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
      await page.fill('input[aria-label="Телефон"]', DEMO_PHONE);
      await page.fill('input[aria-label="Пароль"]', DEMO_PASSWORD);
      await page.getByRole('button', { name: 'Войти', exact: true }).click();
      await page.waitForURL(/wholesale|store|customer|carrier|welcome/, {
        timeout: 20_000,
      });
      await page.waitForTimeout(800);

      await page
        .goto(`${BASE}/customer/catalog`, {
          waitUntil: 'networkidle',
        })
        .catch(() => {});
      await switchRole(page, 'Покупатель');

      // Каталог покупателя → первый товар.
      await page.goto(`${BASE}/customer/catalog`, {
        waitUntil: 'networkidle',
      });
      await page
        .waitForSelector('[data-testid="catalog-product"]', {
          timeout: 10_000,
        })
        .catch(() => {});
      await page.waitForTimeout(600);
      await page.locator('[data-testid="catalog-product"]').first().click();
      await page
        .waitForSelector('[data-testid="product-card"]', { timeout: 10_000 })
        .catch(() => {});
      await page.waitForTimeout(600);

      await scrollToCarousel(page);
      const file = path.join(OUT, `product-${theme}-${name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log(`снято: ${file}`);

      // Свайп-состояние: прокрутить карусель на один шаг (390 light).
      if (theme === 'light' && name === '390') {
        await page.evaluate(() => {
          const el = document.querySelector('[data-testid="carousel-scroll"]');
          if (el) {
            el.scrollBy({ left: 344, behavior: 'instant' });
          }
        });
        await page.waitForTimeout(500);
        const swiped = path.join(OUT, 'product-light-390-swiped.png');
        await page.screenshot({ path: swiped, fullPage: false });
        console.log(`снято: ${swiped}`);
      }

      await context.close();
    }
  }

  await browser.close();
  console.log('готово');
}

main().catch((e) => {
  console.error('Ошибка:', e.message);
  process.exit(1);
});
