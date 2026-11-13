#!/usr/bin/env node
/** Точечное переснятие одного golden (по имени записи манифеста). */
import fs from 'node:fs';
import path from 'node:path';
import { captureSet, readManifest, GOLDEN_DIR } from './visual/screenshot.mjs';

const name = process.argv[2];
if (!name) {
  console.error('использование: node scripts/golden-one.mjs <name>');
  process.exit(1);
}
const entry = readManifest().find((e) => e.name === name);
if (!entry) {
  console.error(`запись ${name} не найдена в манифесте`);
  process.exit(1);
}
const shots = await captureSet([entry]);
const png = shots.get(name);
if (!png) {
  console.error('снимок не получен');
  process.exit(1);
}
fs.writeFileSync(path.join(GOLDEN_DIR, entry.file), png);
console.log(`golden обновлён: ${name} (${png.length} байт)`);
