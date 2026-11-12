#!/usr/bin/env node
/**
 * Переснятие golden-скриншотов (Промт 9, Часть C).
 *
 * Только вручную: pnpm golden:update. Не в CI.
 * После переснятия — обязательный ручной review diff (git diff
 * docs/visual-golden) и коммит: golden — контракт визуала.
 */
import fs from 'node:fs';
import path from 'node:path';
import { captureSet, readManifest, GOLDEN_DIR } from './visual/screenshot.mjs';

async function main() {
  const manifest = readManifest();
  fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  const shots = await captureSet(manifest);
  let updated = 0;
  for (const entry of manifest) {
    const png = shots.get(entry.name);
    if (!png) {
      console.log(`ПРОПУСК ${entry.name}: снимок не получен`);
      continue;
    }
    fs.writeFileSync(path.join(GOLDEN_DIR, entry.file), png);
    updated += 1;
    console.log(`golden: ${entry.name} (${png.length} байт)`);
  }
  console.log(`Обновлено ${updated}/${manifest.length} golden-снимков`);
}

main().catch((e) => {
  console.error('Ошибка:', e.message);
  process.exit(1);
});
