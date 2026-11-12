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
