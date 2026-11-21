#!/usr/bin/env node
/**
 * Демо-сценарий ПРОМТА 18 — часть 2 (кадры 09–11):
 * закреплённый тост после «Скопировать лог», буфер обмена,
 * журнал с ERROR-записью, «Скопировать всё».
 *
 * /dev/logs не требует аутентификации — вход не нужен.
 * Запуск: node scripts/промт18-демо2.mjs
 */
import { chromium } from 'playwright';
import path from 'node:path';

const BASE = process.env.DEMO_BASE_URL ?? 'https://bazar-wdux.onrender.com';
const OUT = path.resolve('download/промт18');

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`скриншот: ${name}.png`);
}

async function main() {
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
    document.head.appendChild(style);
  });

  // Обрываем /health: «Проверка связи» уронит pingApi → error.
  await context.route('**/health*', (route) => route.abort());

  await page.goto(`${BASE}/dev/logs`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="logs-probe"]', { timeout: 30_000 });
  await page.waitForTimeout(600);

  await page.click('[data-testid="logs-probe"]');
  await page.waitForSelector('[data-testid="toast"]', { timeout: 15_000 });
  await page.waitForTimeout(400);

  // «Скопировать лог»: копирует весь буфер и закрепляет тост.
  await page.click('[data-testid="toast-action"]');
  await page.waitForTimeout(3500); // дольше авто-скрытия (3 c)
  const pinned = await page.locator('[data-testid="toast-action"]').isVisible();
  console.log(`тост закреплён после копирования (>3 c): ${pinned}`);
  await shot(page, '09-dev-logs-toast-pinned');

  // Сверка буфера обмена: JSON журнала с network.health ERROR.
  const clipboard = await page.evaluate(() =>
    navigator.clipboard.readText().catch(() => ''),
  );
  let clipOk = false;
  let clipCount = 0;
  try {
    const parsed = JSON.parse(clipboard);
    clipCount = parsed.length;
    const probe = parsed.find((e) => e.action === 'network.health');
    clipOk = Boolean(probe && probe.level === 'error');
    console.log(
      `буфер обмена: ${clipCount} записей, network.health level=${probe?.level} — ${clipOk ? 'совпадает' : 'РАСХОЖДЕНИЕ'}`,
    );
  } catch {
    console.log(
      `буфер обмена: не JSON (длина ${clipboard.length}) — РАСХОЖДЕНИЕ`,
    );
  }

  // Закрыть тост нажатием на карточку → журнал с ERROR-записью.
  await page.locator('[data-testid="toast"] >> text=Ошибка').first().click();
  await page.waitForTimeout(800);
  await shot(page, '10-dev-logs');
  const counter = await page
    .locator('text=/ошибк/')
    .first()
    .textContent()
    .catch(() => '');
  console.log(`строка счётчиков журнала: ${String(counter).trim()}`);

  await context.unroute('**/health*');

  // «Скопировать всё» — тост успеха.
  await page.click('[data-testid="logs-copy"]');
  await page
    .getByText('Журнал скопирован', { exact: false })
    .waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  await shot(page, '11-dev-logs-copy-all');

  await browser.close();
  console.log(
    `итог: тост закреплён=${pinned}, буфер=${clipOk} (${clipCount} записей)`,
  );
}

main().catch((error) => {
  console.error(`ошибка: ${error.message}`);
  process.exitCode = 1;
});
