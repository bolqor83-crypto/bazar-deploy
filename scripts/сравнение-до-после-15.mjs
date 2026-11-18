#!/usr/bin/env node
/**
 * Сравнение «до → после» Промта 15: кадры из download/промт15/до
 * (прод на 14b) против одноимённых из download/промт15/чек-лист
 * (прод на 15). Выход — таблица % отличающихся пикселей + дифф-PNG
 * в download/промт15/дифф-до-после/.
 *
 * Это НЕ gate: карточки и сетка изменились намеренно — таблица
 * показывает масштаб изменений и что фон/шапка не «поплыли».
 */
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const BEFORE = path.resolve('download/промт15/до');
const AFTER = path.resolve('download/промт15/чек-лист');
const DIFF = path.resolve('download/промт15/дифф-до-после');

function load(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

/** Приведение к общей высоте (кадры могли стать длиннее/короче). */
function normalize(a, b) {
  if (a.height === b.height && a.width === b.width) return [a, b];
  const h = Math.max(a.height, b.height);
  for (const img of [a, b]) {
    if (img.height < h) {
      const grown = new PNG({ width: img.width, height: h });
      PNG.bitblt(img, grown, 0, 0, img.width, img.height, 0, 0);
      grown.width = img.width;
      grown.height = h;
      Object.assign(img, grown);
    }
  }
  return [a, b];
}

async function main() {
  fs.mkdirSync(DIFF, { recursive: true });
  const names = fs
    .readdirSync(BEFORE)
    .filter((f) => f.endsWith('.png'))
    .sort();

  console.log('кадр | размер до | размер после | % отличий');
  console.log('--- | --- | --- | ---');
  for (const name of names) {
    const afterPath = path.join(
      AFTER,
      name.replace('orders-', 'orders-grouped-'),
    );
    const actualAfter = fs.existsSync(afterPath)
      ? afterPath
      : path.join(AFTER, name);
    const a = load(path.join(BEFORE, name));
    const b = load(actualAfter);
    const [x, y] = normalize(a, b);
    const diff = new PNG({ width: x.width, height: x.height });
    const changed = pixelmatch(x.data, y.data, diff.data, x.width, x.height, {
      threshold: 0.1,
    });
    const pct = ((changed / (x.width * x.height)) * 100).toFixed(2);
    fs.writeFileSync(
      path.join(DIFF, path.basename(actualAfter).replace('.png', '-diff.png')),
      PNG.sync.write(diff),
    );
    console.log(
      `${name} | ${a.width}x${a.height} | ${b.width}x${b.height} | ${pct}%`,
    );
  }
}

main().catch((e) => {
  console.error('Ошибка:', e.message);
  process.exit(1);
});
