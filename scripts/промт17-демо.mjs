#!/usr/bin/env node
/**
 * Демо-сценарий ПРОМТА 17 (Часть B) на публичном URL:
 * https://bazar-wdux.onrender.com
 *
 * Шаги (§6 DoD):
 *  1. Логин Ивана → роль «Покупатель».
 *  2. Заказ к продавцу без позиции (Агрофирма Север) через API +
 *     подтверждение от Марии Северовой — для unlocated-баннера.
 *  3. «Заказы» → кнопка «Маршрут по рынку» в шапке.
 *  4. Схема + 3 остановки в оптимальном порядке; сверка порядка
 *     и метров с полным перебором (brute force) по ответу API.
 *  5. Toggle «Вернуться к выходу»: total вырос, пунктир появился.
 *  6. Отметка остановки 1 «Пройдено» → перезагрузка → сохранение.
 *  7. Темы/вьюпорты: light/dark × 390/360/430.
 *  8. Empty-состояние: свежий пользователь без заказов.
 *  9. Форма «Точка на рынке» (оптовик).
 *
 * Скриншоты → download/промт17/.
 * Запуск: node scripts/промт17-демо.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.DEMO_BASE_URL ?? 'https://bazar-wdux.onrender.com';
const OUT = path.resolve('download/промт17');
const PHONE = '+7 (900) 123-45-67';
const PASSWORD = 'qwerty123';
const NORTH_PHONE = '+79007770001';
const NORTH_PASSWORD = 'golden-north-123';

fs.mkdirSync(OUT, { recursive: true });

/** Переборный оптимум для сверки (n ≤ 7). */
function bruteForce(points, returnToStart) {
  const n = points.length;
  let best = Infinity;
  const perm = [];
  const used = new Array(n).fill(false);
  const dist = (a, b) =>
    Math.abs(a.spot - b.spot) * 3 + Math.abs(a.row - b.row) * 8;
  const go = () => {
    if (perm.length === n) {
      let total = dist({ row: 0, spot: 0 }, points[perm[0]]);
      for (let i = 0; i + 1 < n; i += 1) {
        total += dist(points[perm[i]], points[perm[i + 1]]);
      }
      if (returnToStart)
        total += dist(points[perm[n - 1]], { row: 0, spot: 0 });
      if (total < best) best = total;
      return;
    }
    for (let i = 0; i < n; i += 1) {
      if (used[i]) continue;
      used[i] = true;
      perm.push(i);
      go();
      perm.pop();
      used[i] = false;
    }
  };
  go();
  return best;
}

async function apiLogin(phone, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) throw new Error(`login ${phone}: ${res.status}`);
  return (await res.json()).accessToken;
}

async function api(token, path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.orgId ? { 'X-Organization-Id': options.orgId } : {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function loginAsDemo(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[aria-label="Телефон"]', PHONE);
  await page.fill('input[aria-label="Пароль"]', PASSWORD);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await page.waitForURL(/wholesale|store|customer|carrier|welcome/, {
    timeout: 30_000,
  });
  await page.waitForTimeout(1000);
}

async function switchRole(page, roleLabel) {
  await page.locator('[aria-label*="Контекст"]').first().click();
  await page
    .getByText('Текущий выбор', { exact: false })
    .waitFor({ timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(400);
  await page.locator(`[aria-label="${roleLabel}"]`).first().click();
  await page.waitForTimeout(300);
  await page.getByText('Применить', { exact: true }).click();
  await page.waitForTimeout(1500);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`скриншот: ${name}.png`);
}

async function main() {
  // ── 0. Подготовка: заказ к Северу (без позиции) + подтверждение.
  const ivanToken = await apiLogin('+79001234567', PASSWORD);
  const northToken = await apiLogin(NORTH_PHONE, NORTH_PASSWORD);
  const northOrgs = await api(northToken, '/organizations');
  const northOrgsList = northOrgs.items ?? northOrgs ?? [];
  const northOrg = northOrgsList.find((o) =>
    String(o.organization?.name ?? o.name ?? '').includes('Север'),
  );
  if (northOrg) {
    const northOrgId = northOrg.organizationId ?? northOrg.id;
    // Оффер Севера — «Помидоры розовые» (golden-подготовка 15E).
    const search = await api(
      ivanToken,
      '/catalog/products?q=' + encodeURIComponent('Помидоры') + '&pageSize=10',
    );
    let northOffer = null;
    for (const product of search.items) {
      const detail = await api(
        ivanToken,
        `/catalog/products/${product.id}/offers`,
      );
      const found = (detail.items ?? detail ?? []).find(
        (o) => o.organization?.id === northOrgId,
      );
      if (found) {
        northOffer = found;
        break;
      }
    }
    if (northOffer) {
      const created = await api(ivanToken, '/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              offerId: northOffer.id,
              quantity: Math.max(5, northOffer.minQuantity ?? 1),
            },
          ],
          deliveryMethod: 'pickup',
        }),
      });
      const northTokenConfirm = await apiLogin(NORTH_PHONE, NORTH_PASSWORD);
      await api(northTokenConfirm, `/seller/orders/${created[0].id}/confirm`, {
        method: 'POST',
        orgId: northOrgId,
      });
      console.log(`заказ к Северу подтверждён: ${created[0].number}`);
    } else {
      console.log('оффер Севера не найден — баннер unlocated не демо');
    }
  } else {
    console.log('организация Севера не найдена');
  }

  // ── 1. Логин + роль покупателя.
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
  });
  await loginAsDemo(page);
  await page
    .goto(`${BASE}/customer/catalog`, { waitUntil: 'networkidle' })
    .catch(() => {});
  await switchRole(page, 'Покупатель');

  // ── 2. «Заказы»: кнопка маршрута в шапке.
  await page.goto(`${BASE}/customer/orders`, { waitUntil: 'networkidle' });
  await page
    .waitForSelector('[data-testid^="order-card-"]', { timeout: 20_000 })
    .catch(() => {});
  await page.waitForSelector('[data-testid="orders-market-route-button"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(600);
  await shot(page, '01-orders-header-route-button');

  // ── 3. Маршрут: схема + остановки, сверка с перебором.
  await page.click('[data-testid="orders-market-route-button"]');
  await page.waitForSelector('[data-testid="market-route-summary"]', {
    timeout: 20_000,
  });
  await page.waitForTimeout(800);
  const routeApi = await api(ivanToken, '/market/route?returnToStart=false');
  const points = routeApi.stops.map((s) => ({ row: s.row, spot: s.spot }));
  const brute = bruteForce(points, false);
  console.log(
    `маршрут API: ${routeApi.stops.length} остановок, ${routeApi.totalMeters} м, ~${routeApi.estimatedMinutes} мин`,
  );
  console.log(
    `порядок API: ${routeApi.stops.map((s) => `${s.seller.name} (${s.row},${s.spot})`).join(' → ')}`,
  );
  console.log(
    `перебор: ${brute} м; API total: ${routeApi.totalMeters} м; совпадает: ${brute === routeApi.totalMeters}`,
  );
  console.log(
    `unlocated: ${routeApi.unlocated.map((u) => `${u.sellerName} (${u.orderNumber})`).join(', ') || '—'}`,
  );
  await shot(page, '02-market-route-light-390');
  await shot(page, '03-market-route-unlocated-banner');

  // ── 4. Toggle «Вернуться к выходу».
  await page.click('[data-testid="market-route-return"]');
  await page.waitForTimeout(1500);
  await page.waitForSelector('[data-testid="market-route-summary"]', {
    timeout: 15_000,
  });
  await page.waitForTimeout(500);
  const cycleApi = await api(ivanToken, '/market/route?returnToStart=true');
  console.log(
    `с возвратом: ${cycleApi.totalMeters} м (без возврата ${routeApi.totalMeters} м), обратное плечо ${cycleApi.returnLegMeters} м`,
  );
  await shot(page, '04-market-route-return-dashed');

  // ── 5. Отметка «Пройдено» + перезагрузка.
  await page.click('[data-testid="market-route-return"]'); // вернуть false
  await page.waitForTimeout(1200);
  await page.click('[data-testid="market-route-stop-1-visited"]');
  await page.waitForTimeout(400);
  await shot(page, '05-market-route-visited');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="market-route-summary"]', {
    timeout: 20_000,
  });
  await page.waitForTimeout(800);
  await shot(page, '06-market-route-visited-after-reload');
  const persisted = await page
    .locator('[data-testid="market-route-stop-1-visited"]')
    .getAttribute('aria-checked');
  const persistedLabel = await page.getByText('Пройдено 1 из').count();
  console.log(
    `отметка после перезагрузки: aria-checked=${persisted}, подпись=${persistedLabel > 0}`,
  );

  // ── 6. Тёмная тема и вьюпорты.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(`${BASE}/customer/market-route`, {
    waitUntil: 'networkidle',
  });
  await page.waitForSelector('[data-testid="market-route-summary"]', {
    timeout: 20_000,
  });
  await page.waitForTimeout(800);
  await shot(page, '07-market-route-dark-390');
  await page.setViewportSize({ width: 360, height: 800 });
  await page.waitForTimeout(600);
  await shot(page, '08-market-route-dark-360');
  await page.emulateMedia({ colorScheme: 'light' });
  await shot(page, '09-market-route-light-360');
  await page.setViewportSize({ width: 430, height: 932 });
  await page.waitForTimeout(600);
  await shot(page, '10-market-route-light-430');
  await page.emulateMedia({ colorScheme: 'dark' });
  await shot(page, '11-market-route-dark-430');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 390, height: 844 });

  // ── 7. Крупный кроп схемы.
  await page.waitForTimeout(600);
  const map = page.locator('[data-testid="market-route-map"]');
  await map
    .screenshot({ path: path.join(OUT, '12-market-map-crop.png') })
    .catch(() => {});
  console.log('скриншот: 12-market-map-crop.png');

  // ── 8. Empty-состояние: свежий покупатель без заказов (новый
  //     контекст — /login недоступен аутентифицированному).
  const fresh = `+7900${Math.floor(1000000 + Math.random() * 8999999)}`;
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: fresh,
      password: 'qwerty123',
      name: 'Проверка Пустая',
    }),
  });
  if (reg.ok) {
    const freshContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const freshPage = await freshContext.newPage();
    await freshPage.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await freshPage.fill('input[aria-label="Телефон"]', fresh);
    await freshPage.fill('input[aria-label="Пароль"]', 'qwerty123');
    await freshPage.getByRole('button', { name: 'Войти', exact: true }).click();
    await freshPage.waitForURL(/welcome|wholesale|customer/, {
      timeout: 30_000,
    });
    await freshPage.goto(`${BASE}/customer/market-route`, {
      waitUntil: 'networkidle',
    });
    await freshPage
      .getByText('Нет подтверждённых заказов')
      .waitFor({ timeout: 15_000 })
      .catch(() => {});
    await freshPage.waitForTimeout(600);
    await shot(freshPage, '13-market-route-empty');
    await freshContext.close();
  } else {
    console.log('регистрация свежего пользователя не прошла');
  }

  // ── 9. Форма «Точка на рынке» (оптовик): контекст Ивана всё ещё
  //     аутентифицирован; wholesale-группа закрыта RoleGuard —
  //     сначала переключаем активную роль на «Оптовик».
  await page
    .goto(`${BASE}/customer/catalog`, { waitUntil: 'networkidle' })
    .catch(() => {});
  await switchRole(page, 'Оптовик');
  await page.goto(`${BASE}/wholesale/market-position`, {
    waitUntil: 'networkidle',
  });
  await page.waitForSelector('[data-testid="market-position-row"]', {
    timeout: 20_000,
  });
  await page.waitForTimeout(800);
  await shot(page, '14-market-position-form');

  await browser.close();
  console.log('демо-сценарий завершён');
}

main().catch((error) => {
  console.error(`ошибка: ${error.message}`);
  process.exitCode = 1;
});
