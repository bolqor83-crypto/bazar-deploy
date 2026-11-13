#!/usr/bin/env node
/**
 * Pixelmatch-проверка golden-скриншотов (Промт 9, Часть C).
 *
 * Сравнивает живые скриншоты с docs/visual-golden через pixelmatch.
 * Tolerance: diffPixels / totalPixels <= 0.5% — pass, иначе fail.
 * Diff-картинки — в download/pixelmatch-diff/<name>-diff.png.
 *
 * Выход: 0 — все прошли; 1 — есть расхождения.
 * Запуск: pnpm test:visual (сервер на :3000 должен быть поднят).
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import {
  captureSet,
  readManifest,
  GOLDEN_DIR,
  TOLERANCE_PCT,
} from './visual/screenshot.mjs';

const DIFF_DIR = path.resolve('download/pixelmatch-diff');

async function main() {
  let manifest = readManifest();
  // VISUAL_ONLY=name1,name2 — фильтр записей (самотест ускоряется
  // с ~15 минут до секунд: сравнивается только затронутый экран).
  if (process.env.VISUAL_ONLY) {
    const wanted = new Set(String(process.env.VISUAL_ONLY).split(','));
    manifest = manifest.filter((e) => wanted.has(e.name));
  }
  fs.mkdirSync(DIFF_DIR, { recursive: true });

  let passed = 0;
  const failed = [];

  const shots = await captureSet(manifest);
  for (const entry of manifest) {
    const goldenPath = path.join(GOLDEN_DIR, entry.file);
    if (!fs.existsSync(goldenPath)) {
      failed.push({ name: entry.name, reason: 'golden отсутствует', pct: 100 });
      console.log(`FAIL ${entry.name}: golden-файл отсутствует`);
      continue;
    }
    const goldenPng = PNG.sync.read(fs.readFileSync(goldenPath));
    const liveBuffer = shots.get(entry.name);
    if (!liveBuffer) {
      failed.push({ name: entry.name, reason: 'снимок не получен', pct: 100 });
      console.log(`FAIL ${entry.name}: живой снимок не получен`);
      continue;
    }
    const livePng = PNG.sync.read(liveBuffer);

    if (
      goldenPng.width !== livePng.width ||
      goldenPng.height !== livePng.height
    ) {
      failed.push({
        name: entry.name,
        reason: `размер ${livePng.width}x${livePng.height} vs ${goldenPng.width}x${goldenPng.height}`,
        pct: 100,
      });
      console.log(`FAIL ${entry.name}: размер не совпадает`);
      continue;
    }

    const { width, height } = livePng;
    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(
      goldenPng.data,
      livePng.data,
      diff.data,
      width,
      height,
      {
        threshold: 0.1,
      },
    );
    const pct = (diffPixels / (width * height)) * 100;

    if (pct > TOLERANCE_PCT) {
      failed.push({ name: entry.name, reason: `${pct.toFixed(3)}%`, pct });
      const diffPath = path.join(DIFF_DIR, `${entry.name}-diff.png`);
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
      console.log(
        `FAIL ${entry.name}: ${pct.toFixed(3)}% (> ${TOLERANCE_PCT}%), diff → ${diffPath}`,
      );
    } else {
      passed += 1;
      console.log(`PASS ${entry.name}: ${pct.toFixed(3)}%`);
    }
  }

  const total = manifest.length;
  console.log('');
  console.log(
    `Итог: ${passed}/${total} passed, ${failed.length} failed (tolerance ${TOLERANCE_PCT}%)`,
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('Ошибка:', e.message);
  process.exitCode = 1;
});
