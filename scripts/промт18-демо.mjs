#!/usr/bin/env node
/**
 * Демо-сценарий ПРОМТА 18 (финал) на публичном URL:
 * https://bazar-wdux.onrender.com
 *
 * Шаги (DoD финала):
 *  1. Health прода → version == 3608284…; публичные агрегаты Layer 0
 *     (/api/market/trends, /volumes) с данными; контур продавца
 *     (/anomalies, /users) с JWT + X-Organization-Id.
 *  2. Логин Ивана → роль «Оптовик» → /wholesale/analytics:
 *     тренды/объёмы/топ/аномалии, сверка цифр карточек с API.
 *  3. Темы/вьюпорты: light/dark × 390/360/430, кроп трендов,
 *     период «Месяц».
 *  4. Empty-состояние — Playwright-перехват trends/volumes →
 *     items: [] (на проде данные есть, состояние показано честно
 *     через мок ответа, в отчёте помечено).
 *  5. /dev/logs: «Проверка связи» при оборванном /health →
 *     error в журнале + тост «Скопировать лог»; нажатие копирует
 *     буфер и закрепляет тост (>3 c); сверка буфера обмена.
 *
 * Скриншоты → download/промт18/.
 * Запуск: node scripts/промт18-демо.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.DEMO_BASE_URL ?? 'https://bazar-wdux.onrender.com';
const OUT = path.resolve('download/промт18');
const PHONE = '+79001234567';
const PASSWORD = 'qwerty123';

fs.mkdirSync(OUT, { recursive: true });

async function apiLogin(phone, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) throw new Error(`login ${phone}: ${res.status}`);
  return (await res.json()).accessToken;
}

async function api(token, apiPath, orgId) {
  const res = await fetch(`${BASE}/api${apiPath}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(orgId ? { 'X-Organization-Id': orgId } : {}),
    },
  });
  const text = await res.text();
  if (!res.ok)
    throw new Error(`${apiPath}: ${res.status} ${text.slice(0, 200)}`);
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

/** Форматирование цены как в UI (копейки → рубли).
 *  Зеркало formatPrice из PriceDisplay: узкий неразрывный
 *  пробел (U+202F) как разделитель групп и перед ₽ — иначе
 *  сверка aria-label ломается на whitespace (найдено на финале). */
function priceRub(kopecks) {
  const rub = kopecks / 100;
  const hasKopecks = Math.round(kopecks) % 100 !== 0;
  const formatted = rub.toLocaleString('ru-RU', {
    minimumFractionDigits: hasKopecks ? 2 : 0,
    maximumFractionDigits: 2,
  });
  const narrow = '\u202F';
  return `${formatted.replace(/\u00A0/g, narrow)}${narrow}₽`;
}

async function main() {
  // ── 1. Публичные проверки API (Layer 0) на проде.
  const health = await api(null, '/health');
  console.log(
    `health: ${health.status}, db=${health.db}, version=${health.version.slice(0, 7)}`,
  );

  const trendsApi = await api(null, '/market/trends?period=week');
  const volumesApi = await api(null, '/market/volumes?period=week');
  console.log(`trends (week, публичный): ${trendsApi.items.length} категорий`);
  for (const t of trendsApi.items) {
    console.log(
      `  ${t.categoryName}: ${priceRub(t.avgPriceKopecks)} · ${t.offers} предл. · Δ ${t.changePercent === null ? '—' : `${t.changePercent}%`}`,
    );
  }
  console.log(`volumes (week, публичный):`);
  for (const v of volumesApi.items) {
    console.log(`  ${v.productName}: ${v.quantity} × ${v.unit}`);
  }

  const ivanToken = await apiLogin(PHONE, PASSWORD);
  const orgs = await api(ivanToken, '/organizations');
  const opt = (orgs.items ?? orgs).find((o) => o.role === 'wholesale_seller');
  const optOrgId = opt?.organizationId ?? opt?.id;
  const anomaliesApi = await api(
    ivanToken,
    '/market/anomalies?period=week',
    optOrgId,
  );
  const usersApi = await api(ivanToken, '/market/users?period=week', optOrgId);
  console.log(
    `anomalies (week, продавец ${opt?.organization?.name ?? opt?.name}): ${anomaliesApi.items.map((a) => `${a.type}: ${a.entity} (z=${a.zScore})`).join('; ') || '—'}`,
  );
  console.log(
    `users (week, продавец): всего ${usersApi.total} — ${usersApi.items.map((u) => `${u.role}: ${u.count}`).join(', ')}`,
  );

  // Проверка 401 без токена на закрытом контуре.
  const an401 = await fetch(`${BASE}/api/market/anomalies?period=week`);
  console.log(`anomalies без токена: ${an401.status} (ожидаем 401)`);

  // ── 2. Браузер: логин + роль оптовика.
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    permissions: ['clipboard-read', 'clipboard-write'],
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
    style.setAttribute('data-demo', 'freeze');
    document.head.appendChild(style);
  });
  await loginAsDemo(page);
  await page
    .goto(`${BASE}/customer/catalog`, { waitUntil: 'networkidle' })
    .catch(() => {});
  await switchRole(page, 'Оптовик');

  // ── 3. Дашборд аналитики (Layer 1) с данными прода.
  await page.goto(`${BASE}/wholesale/analytics`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="analytics-volumes"]', {
    timeout: 30_000,
  });
  await page.waitForTimeout(1200);
  await shot(page, '01-analytics-light-390');

  // Сверка карточек трендов с API (aria-label TrendCard).
  const cards = await page.locator('[aria-label^="Тренд "]').all();
  let mismatch = 0;
  for (const card of cards) {
    const label = await card.getAttribute('aria-label');
    const name = label.match(/^Тренд ([^:]+):/)?.[1];
    const apiItem = trendsApi.items.find((t) => t.categoryName === name);
    const uiPrice = label.match(/средняя (.+?), изменение/)?.[1];
    const apiPrice = apiItem ? priceRub(apiItem.avgPriceKopecks) : '—';
    const ok = uiPrice === apiPrice;
    if (!ok) mismatch += 1;
    console.log(
      `сверка «${name}»: UI ${uiPrice} vs API ${apiPrice} — ${ok ? 'совпадает' : 'РАСХОЖДЕНИЕ'}`,
    );
  }
  console.log(
    `сверка трендов UI↔API: ${cards.length} карточек, расхождений ${mismatch}`,
  );

  // Кроп секции «Тренды цен».
  const trendHeading = page.getByText('Тренды цен', { exact: true });
  const box = await trendHeading.boundingBox();
  if (box) {
    await page.screenshot({
      clip: {
        x: 0,
        y: Math.max(0, box.y - 12),
        width: 390,
        height: Math.min(420, 844 - Math.max(0, box.y - 12)),
      },
      path: path.join(OUT, '05-analytics-trends-crop.png'),
    });
    console.log('скриншот: 05-analytics-trends-crop.png');
  }

  // ── 4. Период «Месяц».
  await page.getByText('Месяц', { exact: true }).click();
  await page.waitForTimeout(1500);
  await page
    .waitForSelector('[data-testid="analytics-volumes"]', { timeout: 20_000 })
    .catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, '06-analytics-month-390');

  // ── 5. Тёмная тема и вьюпорты.
  await page.getByText('Неделя', { exact: true }).click();
  await page.waitForTimeout(1200);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(600);
  await shot(page, '02-analytics-dark-390');
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(600);
  await shot(page, '03-analytics-light-360');
  await page.setViewportSize({ width: 430, height: 932 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(600);
  await shot(page, '04-analytics-dark-430');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);

  // ── 6. Empty-состояние: перехват trends/volumes → пусто.
  //     На проде данные есть, поэтому состояние показано моком
  //     ответа (в отчёте помечено).
  await context.route('**/api/market/trends*', (route) =>
    route.fulfill({ json: { period: 'week', items: [] } }),
  );
  await context.route('**/api/market/volumes*', (route) =>
    route.fulfill({ json: { period: 'week', items: [] } }),
  );
  await page.goto(`${BASE}/wholesale/analytics`, { waitUntil: 'networkidle' });
  await page
    .getByText('Пока нет данных', { exact: false })
    .waitFor({ timeout: 15_000 });
  await page.waitForTimeout(600);
  await shot(page, '07-analytics-empty-390');
  await context.unroute('**/api/market/trends*');
  await context.unroute('**/api/market/volumes*');

  // ── 7. /dev/logs: ошибка связи → тост «Скопировать лог».
  await context.route('**/health*', (route) => route.abort());
  await page.goto(`${BASE}/dev/logs`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="logs-probe"]', { timeout: 20_000 });
  await page.waitForTimeout(800);
  await page.click('[data-testid="logs-probe"]');
  await page.waitForSelector('[data-testid="toast"]', { timeout: 15_000 });
  await page.waitForTimeout(400);
  await shot(page, '08-dev-logs-toast');

  // Нажатие «Скопировать лог»: копирует буфер, тост закрепляется.
  await page.click('[data-testid="toast-action"]');
  await page.waitForTimeout(3500); // дольше авто-скрытия (3 c)
  const toastStillVisible = await page
    .locator('[data-testid="toast-action"]')
    .isVisible();
  console.log(`тост закреплён после копирования (>3 c): ${toastStillVisible}`);
  await shot(page, '09-dev-logs-toast-pinned');

  // Сверка буфера обмена: JSON записей журнала.
  const clipboard = await page.evaluate(() =>
    navigator.clipboard.readText().catch(() => ''),
  );
  let clipOk = false;
  try {
    const parsed = JSON.parse(clipboard);
    const probe = parsed.find((e) => e.action === 'network.health');
    clipOk = Boolean(probe && probe.level === 'error');
    console.log(
      `буфер обмена: ${parsed.length} записей, network.health level=${probe?.level} — ${clipOk ? 'совпадает' : 'РАСХОЖДЕНИЕ'}`,
    );
  } catch {
    console.log('буфер обмена: не JSON — РАСХОЖДЕНИЕ');
  }

  // Закрыть тост нажатием на карточку → журнал с ERROR-записью.
  await page.locator('[data-testid="toast"] >> text=Ошибка').first().click();
  await page.waitForTimeout(800);
  await shot(page, '10-dev-logs');
  const counts = await page
    .getByText(/ошибка/, { exact: false })
    .first()
    .textContent()
    .catch(() => '');
  console.log(`строка счётчиков журнала: ${String(counts).trim()}`);

  await context.unroute('**/health*');

  // ── 8. «Скопировать всё» — тост успеха.
  await page.click('[data-testid="logs-copy"]');
  await page.waitForSelector('[data-testid="toast"]', { timeout: 10_000 });
  await page.waitForTimeout(400);
  await shot(page, '11-dev-logs-copy-all');

  await browser.close();
  console.log('демо-сценарий завершён');
  console.log(
    `итог проверок: тост закреплён=${toastStillVisible}, буфер=${clipOk}`,
  );
}

main().catch((error) => {
  console.error(`ошибка: ${error.message}`);
  process.exitCode = 1;
});
