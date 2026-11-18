#!/usr/bin/env node
/** Досъём профиля покупателя для чек-листа 15 (одиночный кадр). */
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import {
  BASE_URL,
  disableAnimations,
  applyMasks,
  loginAsDemo,
  switchRole,
} from './visual/screenshot.mjs';

const OUT = path.resolve('download/промт15/чек-лист');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(`${BASE_URL}/customer/profile`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(800);
  await applyMasks(page);
  await page.screenshot({
    path: path.join(OUT, 'profile-customer-light-390.png'),
  });
  console.log('снято: profile-customer-light-390');
  await context.close();
  await browser.close();
}

main().catch((e) => {
  console.error('Ошибка:', e.message);
  process.exit(1);
});
