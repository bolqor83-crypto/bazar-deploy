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
  let manifest = readManifest();
  // VISUAL_ONLY=name1,name2 — переснять только выбранные экраны.
  if (process.env.VISUAL_ONLY) {
    const wanted = new Set(String(process.env.VISUAL_ONLY).split(','));
    manifest = manifest.filter((e) => wanted.has(e.name));
  }
  fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  const { shots, prepFailed } = await captureSet(manifest);
  let updated = 0;
  for (const entry of manifest) {
    if (prepFailed.has(entry.name)) {
      console.log(
        `ПРОПУСК ${entry.name}: prep_failed — подготовка не удалась, ` +
          `golden не перезаписывается`,
      );
      continue;
    }
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
