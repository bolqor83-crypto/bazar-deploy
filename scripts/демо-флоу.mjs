#!/usr/bin/env node
/**
 * Демо-флоу Промта 9 (Части D+E): полный путь покупателя
 * от входа до созданного заказа, скриншоты в download/промт9.
 *
 * Сценарий: логин Ивана → каталог (светлая/тёмная) → поиск →
 * категория → карточка товара → количество → в корзину (тост) →
 * второй товар → корзина (badge 2) → изменение количества →
 * checkout → комментарий → заказ создан → список заказов →
 * карточка (таймлайн) → диалог отмены (без подтверждения) → профиль.
 *
 * Запуск: node scripts/демо-флоу.mjs (сервер на :3000 должен быть поднят;
 * BASE — публичный URL или localhost).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.DEMO_BASE_URL ?? 'http://localhost:3000';
const OUT = process.env.DEMO_OUT ?? '/home/z/my-project/download/промт9';

const DEMO_PHONE = '+7 (900) 123-45-67';
const DEMO_PASSWORD = 'qwerty123';

let counter = 0;
async function shot(page, name) {
  counter += 1;
  const file = path.join(
    OUT,
    `${String(counter).padStart(2, '0')}-${name}.png`,
  );
  await page.screenshot({ path: file, fullPage: false });
  console.log(`✓ ${path.basename(file)}`);
}

/** Переключить активную роль через ContextSheet (как в golden). */
async function switchRole(page, roleLabel) {
  await page.locator('[aria-label*="Контекст"]').first().click();
  await page
    .getByText('Текущий выбор', { exact: false })
    .waitFor({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(400);
  await page.locator(`[aria-label="${roleLabel}"]`).first().click();
  await page.waitForTimeout(400);
  await page.getByText('Применить', { exact: true }).click();
  await page.waitForTimeout(1500);
}

async function settle(page, url, text) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
  if (text) {
    await page
      .waitForSelector(`text=${text}`, { timeout: 15_000 })
      .catch(() => {});
  }
  await page.waitForTimeout(600);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

try {
  fs.mkdirSync(OUT, { recursive: true });
  const page = await context.newPage();

  // Отключить анимации для стабильных снимков (кроме тостов — их ловим вживую).
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        transition: none !important;
        caret-color: transparent !important;
      }
    `;
    document.addEventListener('DOMContentLoaded', () => {
      document.head.appendChild(style);
    });
  });

  // --- 01. Вход (гость) ---
  await settle(page, '/login', 'Вход в Bazar');
  await shot(page, 'вход-светлая');

  // Логин Ивана → пост-логин: контекст оптовика (ADR 0004) →
  // переключаемся на роль покупателя через ContextSheet.
  await page.fill('input[aria-label="Телефон"]', DEMO_PHONE);
  await page.fill('input[aria-label="Пароль"]', DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await page.waitForURL(/customer|wholesale|store|carrier/, {
    timeout: 20_000,
  });
  await page.waitForTimeout(1000);
  await switchRole(page, 'Покупатель');
  await page.waitForURL(/customer/, { timeout: 10_000 });
  await page.waitForTimeout(800);

  // --- 02-03. Каталог: светлая и тёмная ---
  await settle(page, '/customer/catalog', 'Каталог');
  await shot(page, 'каталог-светлая');

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(500);
  await shot(page, 'каталог-тёмная');
  await page.emulateMedia({ colorScheme: 'light' });

  // --- 04. Поиск «помидоры» ---
  await page.fill('input[aria-label="Поиск по каталогу"]', 'помидоры');
  await page.waitForTimeout(1600);
  await shot(page, 'поиск-помидоры');
  await page.fill('input[aria-label="Поиск по каталогу"]', '');
  await page.waitForTimeout(800);

  // --- 05. Категория «Овощи» ---
  await page.locator('[data-testid="chip-vegetables"]').click();
  await page.waitForTimeout(1400);
  await shot(page, 'категория-овощи');
  await page.locator('[data-testid="chip-all"]').click();
  await page.waitForTimeout(1000);

  // --- 06-08. Первый товар: количество, в корзину, тост ---
  await page.locator('[data-testid="catalog-product"]').first().click();
  await page.waitForSelector('[data-testid="product-card"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(700);
  await shot(page, 'карточка-товара');

  await page.getByLabel('Увеличить количество').click();
  await page.waitForTimeout(400);
  await shot(page, 'карточка-количество');

  await page.locator('[data-testid="add-to-cart"]').click();
  await page.waitForSelector('[data-testid="toast"]', { timeout: 10_000 });
  await shot(page, 'тост-добавлено');
  await page.waitForTimeout(3500);

  // --- 09. Второй товар ---
  await page.goBack();
  await page.waitForSelector('[data-testid="catalog-product"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(600);
  await page.locator('[data-testid="catalog-product"]').nth(1).click();
  await page.waitForSelector('[data-testid="product-card"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(700);
  await shot(page, 'второй-товар');
  await page.locator('[data-testid="add-to-cart"]').click();
  await page.waitForSelector('[data-testid="toast"]', { timeout: 10_000 });
  await page.waitForTimeout(3000);

  // --- 10-12. Корзина: 2 позиции, badge, изменение количества ---
  await page.goBack();
  await page.waitForSelector('[data-testid="catalog-product"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(800);
  await page.getByRole('tab', { name: 'Корзина' }).click();
  await page.waitForTimeout(1500);
  await shot(page, 'корзина-две-позиции-badge');

  await page.getByLabel('Увеличить количество').first().click();
  await page.waitForTimeout(800);
  await shot(page, 'корзина-изменение-количества');

  // Тёмная корзина
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(500);
  await shot(page, 'корзина-тёмная');
  await page.emulateMedia({ colorScheme: 'light' });

  // --- 13-15. Checkout ---
  await page.locator('[data-testid="cart-checkout"]').click();
  await page.waitForSelector('text=Оформление заказа', { timeout: 15_000 });
  await page.waitForTimeout(800);
  await shot(page, 'checkout-сводка');

  await page
    .locator('[data-testid="checkout-comment"]')
    .fill('Позвонить за час до доставки');
  await page.waitForTimeout(400);
  await shot(page, 'checkout-комментарий');

  await page.locator('[data-testid="checkout-submit"]').click();
  await page.waitForSelector('[data-testid="order-timeline"]', {
    timeout: 20_000,
  });
  await page.waitForTimeout(700);
  await shot(page, 'заказ-создан-карточка');

  // --- 16-18. Список заказов, карточка, диалог отмены ---
  // После создания заказа приложение на карточке (подэкран без
  // таб-бара) — переходим в список напрямую (контекст уже покупатель).
  await page.goto(`${BASE}/customer/orders`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid^="order-card-"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(800);
  await shot(page, 'список-заказов');

  await page.locator('[data-testid^="order-card-"]').first().click();
  await page.waitForSelector('[data-testid="order-timeline"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(800);
  await shot(page, 'карточка-заказа-таймлайн');

  await page.locator('[data-testid="order-cancel"]').click();
  await page.waitForSelector('text=Отменить заказ?', { timeout: 10_000 });
  await page.waitForTimeout(500);
  await shot(page, 'диалог-отмены');
  await page.getByRole('button', { name: 'Оставить', exact: true }).click();
  await page.waitForTimeout(600);

  // --- 19. Профиль ---
  await page.goto(`${BASE}/customer/profile`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await shot(page, 'профиль-покупателя');

  console.log(`\nГотово: ${counter} скриншотов в ${OUT}`);
} finally {
  await browser.close();
}
