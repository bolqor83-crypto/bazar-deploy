/**
 * Общий модуль съёмки golden-скриншотов (Промт 9, Часть C).
 *
 * Используется и update-golden.mjs (перезапись), и pixelmatch-check.mjs
 * (сравнение) — идентичный проход гарантирует воспроизводимый дифф.
 *
 * Среда: сервер на http://localhost:3000 (API + статика mobile,
 * ServeStaticModule). Тема — prefers-color-scheme. Аутентификация —
 * реальный логин Ивана (демо-аккаунт из seed).
 *
 * Группировка (Промт 9): guest-записи снимаются в чистом контексте,
 * user-записи — в одном контексте с единственным логином
 * (rate limit auth: 5/мин) и переключением ролей через ContextSheet.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

export const GOLDEN_DIR = path.resolve('docs/visual-golden');
export const BASE_URL = process.env.VISUAL_BASE_URL ?? 'http://localhost:3000';
export const TOLERANCE_PCT = 0.5;

/** Демо-аккаунт из seed (Промт 7). */
const DEMO_PHONE = '+7 (900) 123-45-67';
const DEMO_PASSWORD = 'qwerty123';

/** Вьюпорты из визуальных стандартов (Промт 8). */
export const VIEWPORTS = {
  360: { width: 360, height: 800 },
  390: { width: 390, height: 844 },
  430: { width: 430, height: 932 },
};

/** Русские подписи ролей (ROLE_LABEL в navigation.ts). */
const ROLE_LABELS = {
  customer: 'Покупатель',
  store_owner: 'Владелец точки',
  wholesale_seller: 'Оптовик',
  carrier: 'Перевозчик',
};

/** Маски-селекторы (детерминизация снимка). */
export function maskSelectors() {
  const configPath = path.resolve('scripts/pixelmatch-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return config.maskSelectors ?? [];
}

/** Подготовка страницы: вьюпорт, тема, отключение анимаций. */
export async function preparePage(context, entry) {
  const page = await context.newPage();
  const vp = VIEWPORTS[entry.viewport] ?? VIEWPORTS[390];
  await page.setViewportSize(vp);
  await page.emulateMedia({
    colorScheme: entry.theme === 'dark' ? 'dark' : 'light',
  });
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
  return page;
}

/** Применить маски (скрытие динамических зон) перед снимком. */
export async function applyMasks(page) {
  const selectors = maskSelectors();
  if (selectors.length === 0) return;
  const css = selectors
    .map((s) => `${s} { visibility: hidden !important; }`)
    .join('\n');
  await page.addStyleTag({ content: css });
}

/** Открыть URL и дождаться стабильности (networkidle + текст + пауза). */
export async function settle(page, entry) {
  await page.goto(`${BASE_URL}${entry.url}`, { waitUntil: 'networkidle' });
  if (entry.waitForText) {
    await page
      .waitForSelector(`text=${entry.waitForText}`, { timeout: 10_000 })
      .catch(() => {});
  }
  await page.waitForTimeout(500);
}

/** Логин Ивана через форму входа (гидратирует auth-состояние). */
export async function loginAsDemo(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[aria-label="Телефон"]', DEMO_PHONE);
  await page.fill('input[aria-label="Пароль"]', DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  // Пост-логин маршрутизация: приоритет членств — wholesale (ADR 0004).
  await page.waitForURL(/wholesale|store|customer|carrier|welcome/, {
    timeout: 20_000,
  });
  await page.waitForTimeout(800);
}

/** Переключить активную роль через ContextSheet. */
export async function switchRole(page, roleLabel) {
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

/** Открыть ContextSheet (снимок шита переключения контекста). */
async function openContextSheet(page) {
  await page.locator('[aria-label*="Контекст"]').first().click();
  await page
    .getByText('Текущий выбор', { exact: false })
    .waitFor({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(600);
}

/** Телефон демо-аккаунта в формате хранения (E.164 без пробелов). */
const DEMO_PHONE_RAW = '+79001234567';

/** POST /auth/login из Node — токен для подготовки состояния. */
async function apiLogin() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: DEMO_PHONE_RAW, password: DEMO_PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`apiLogin: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  return body.accessToken;
}

/** Первое предложение первого товара каталога (стабильный выбор seed). */
async function firstOffer(token) {
  const auth = { Authorization: `Bearer ${token}` };
  const productsRes = await fetch(
    `${BASE_URL}/api/catalog/products?pageSize=1`,
    { headers: auth },
  );
  if (!productsRes.ok) {
    throw new Error(`products: ${productsRes.status}`);
  }
  const products = await productsRes.json();
  const product = products.items[0];
  const offersRes = await fetch(
    `${BASE_URL}/api/catalog/products/${product.id}/offers`,
    { headers: auth },
  );
  if (!offersRes.ok) {
    throw new Error(`offers: ${offersRes.status}`);
  }
  const offers = await offersRes.json();
  return offers.items[0];
}

/**
 * Детерминированное состояние корзины Ивана (Промт 9, Часть C):
 * очистить и положить ровно одну позицию — первого товара каталога
 * ×2 (или minQuantity). Корзина участвует в golden трёх экранов
 * (cart, checkout) и в badge таб-бара на всех экранах покупателя —
 * без сброса каждый прогон CI наследовал бы состояние прошлого.
 */
async function resetDemoCart(token, offer) {
  const auth = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const clear = await fetch(`${BASE_URL}/api/cart`, {
    method: 'DELETE',
    headers: auth,
  });
  if (!clear.ok) {
    throw new Error(`clear cart: ${clear.status}`);
  }
  const quantity = Math.max(2, offer.minQuantity ?? 1);
  const add = await fetch(`${BASE_URL}/api/cart/items`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ offerId: offer.id, quantity }),
  });
  if (!add.ok) {
    throw new Error(`add item: ${add.status} ${await add.text()}`);
  }
  return quantity;
}

/**
 * Снять набор записей манифеста. Возвращает Map<name, Buffer PNG>.
 * Группировка: guest-контекст и user-контекст (один логин на всех).
 */
export async function captureSet(entries) {
  const shots = new Map();
  const browser = await chromium.launch();
  try {
    // --- Гостевые экраны: чистый контекст. ---
    const guestContext = await browser.newContext({
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    for (const entry of entries) {
      if (entry.authState === 'user') continue;
      const page = await preparePage(guestContext, entry);
      await settle(page, entry);
      await applyMasks(page);
      shots.set(entry.name, await page.screenshot({ fullPage: false }));
      await page.close();
    }
    await guestContext.close();

    // --- Экраны пользователя: один логин, переключение ролей. ---
    const userEntries = entries.filter((e) => e.authState === 'user');
    if (userEntries.length > 0) {
      // Детерминированная корзина Ивана до съёмки: 1 позиция
      // (влияет на cart/checkout golden и badge таб-бара).
      try {
        const token = await apiLogin();
        const offer = await firstOffer(token);
        const quantity = await resetDemoCart(token, offer);
        console.log(
          `подготовка: корзина Ивана = 1 позиция × ${quantity} (${offer.id})`,
        );
      } catch (e) {
        console.warn(`подготовка корзины не удалась: ${e.message}`);
      }

      const userContext = await browser.newContext({
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      const loginPage = await userContext.newPage();
      await loginAsDemo(loginPage);
      await loginPage.close();

      let activeRole = 'wholesale_seller';
      for (const entry of userEntries) {
        const page = await preparePage(userContext, entry);
        const targetRole = entry.role ?? 'customer';
        if (targetRole !== activeRole) {
          await page
            .goto(`${BASE_URL}/customer/catalog`, { waitUntil: 'networkidle' })
            .catch(() => {});
          await switchRole(page, ROLE_LABELS[targetRole]);
          activeRole = targetRole;
        }
        await settle(page, entry);
        if (entry.openFirstProduct) {
          const card = page.locator('[data-testid="catalog-product"]').first();
          await card.click();
          // Ждать контент товара (не скелетон): карточка с testID product-card
          // появляется после загрузки данных из API.
          await page
            .waitForSelector('[data-testid="product-card"]', {
              timeout: 10_000,
            })
            .catch(() => {});
          await page.waitForTimeout(600);
        }
        if (entry.openContextSheet) {
          await openContextSheet(page);
        }
        if (entry.openFirstOrder) {
          // Открыть первый заказ из списка: карточки order-card-<i>.
          // Клик надёжен не везде (медленный CI: гидратация React
          // опаздывает за появлением DOM) — до 3 попыток, успех
          // контролируем сменой URL на /orders/<id>.
          await page
            .waitForSelector('[data-testid^="order-card-"]', {
              timeout: 15_000,
            })
            .catch(() => {});
          let opened = false;
          for (let attempt = 0; attempt < 3 && !opened; attempt += 1) {
            await page
              .locator('[data-testid^="order-card-"]')
              .first()
              .click({ timeout: 5000 })
              .catch(() => {});
            try {
              await page.waitForURL(/\/orders\/[^/]+/, { timeout: 8000 });
              opened = true;
            } catch {
              await page.waitForTimeout(1500);
            }
          }
          await page
            .waitForSelector('[data-testid="order-timeline"]', {
              timeout: 10_000,
            })
            .catch(() => {});
          await page.waitForTimeout(800);
        }
        await applyMasks(page);
        shots.set(entry.name, await page.screenshot({ fullPage: false }));
        await page.close();
      }
      await userContext.close();
    }
  } finally {
    await browser.close();
  }
  return shots;
}

/** Прочитать манифест golden-набора. */
export function readManifest() {
  return JSON.parse(
    fs.readFileSync(path.join(GOLDEN_DIR, 'manifest.json'), 'utf8'),
  );
}
