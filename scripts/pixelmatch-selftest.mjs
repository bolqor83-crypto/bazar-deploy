#!/usr/bin/env node
/**
 * Самотест pixelmatch CI (Промт 9, §6.4).
 *
 * Tolerance 0.5% от 780x1688 (390x844 @2x) = ~6580 пикселей,
 * поэтому «1 пиксель» (0.00008%) не может уронить проверку —
 * самотест verifies обе границы:
 *
 * 1. Точечное изменение 1 пикселя — в пределах tolerance (exit 0):
 *    чувствительность pixelmatch к микрошуму не ломает CI.
 * 2. Заметный блок 100x100 (0.76% > 0.5%) — check ПАДАЕТ (exit 1).
 * 3. Восстановление golden — check проходит (exit 0).
 *
 * Запуск: node scripts/pixelmatch-selftest.mjs (сервер :3000 поднят).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { PNG } from 'pngjs';

const GOLDEN = 'docs/visual-golden/login-light-390.png';
const abs = path.resolve(GOLDEN);
const backup = fs.readFileSync(abs);

function runCheck() {
  try {
    execSync('node scripts/pixelmatch-check.mjs', { stdio: 'pipe' });
    return 0;
  } catch (e) {
    return e.status ?? 1;
  }
}

function paint(png, x0, y0, w, h, rgba) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const idx = (png.width * y + x) * 4;
      png.data[idx] = rgba[0];
      png.data[idx + 1] = rgba[1];
      png.data[idx + 2] = rgba[2];
      png.data[idx + 3] = 255;
    }
  }
}

const results = [];

// Шаг 1: один пиксель (контрастная инверсия центра).
{
  const png = PNG.sync.read(backup);
  const x = Math.floor(png.width / 2);
  const y = Math.floor(png.height / 2);
  paint(png, x, y, 1, 1, [255, 0, 255]);
  fs.writeFileSync(abs, PNG.sync.write(png));
  const code = runCheck();
  const ok = code === 0;
  results.push(ok);
  console.log(
    `Шаг 1 (ровно 1 пиксель, 0.00008%): exit=${code} — ${ok ? 'в пределах tolerance, ОК' : 'НЕ ОЖИДАЕМ: упал'}`,
  );
}

// Шаг 2: блок 100x100 контрастного цвета (0.76% > 0.5%).
{
  const png = PNG.sync.read(backup);
  const x0 = Math.floor(png.width / 2) - 50;
  const y0 = Math.floor(png.height / 2) - 50;
  paint(png, x0, y0, 100, 100, [255, 0, 255]);
  fs.writeFileSync(abs, PNG.sync.write(png));
  const code = runCheck();
  const ok = code === 1;
  results.push(ok);
  console.log(
    `Шаг 2 (блок 100x100, 0.76% > 0.5%): exit=${code} — ${ok ? 'ПАДЕНИЕ, ОК' : 'НЕ УПАЛ, ОШИБКА'}`,
  );
}

// Шаг 3: восстановление.
fs.writeFileSync(abs, backup);
{
  const code = runCheck();
  const ok = code === 0;
  results.push(ok);
  console.log(
    `Шаг 3 (golden восстановлен): exit=${code} — ${ok ? 'ПРОШЁЛ, ОК' : 'УПАЛ, ОШИБКА'}`,
  );
}

if (results.every(Boolean)) {
  console.log('САМОТЕСТ: границы tolerance работают корректно — OK');
} else {
  console.error('САМОТЕСТ: провал');
  process.exitCode = 1;
}
