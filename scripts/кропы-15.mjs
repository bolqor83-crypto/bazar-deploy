#!/usr/bin/env node
/** Кропы подозрительных зон для проверки VLM-замечаний (не дефект = не трогаем). */
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('download/промт15/чек-лист');
const OUT = path.resolve('download/промт15/кропы-проверки');
fs.mkdirSync(OUT, { recursive: true });

function crop(file, outName, x, y, w, h) {
  const img = PNG.sync.read(fs.readFileSync(path.join(SRC, file)));
  const scaled = (v) => Math.round(v * 2); // deviceScaleFactor 2
  const c = new PNG({ width: scaled(w), height: scaled(h) });
  PNG.bitblt(img, c, scaled(x), scaled(y), scaled(w), scaled(h), 0, 0);
  fs.writeFileSync(path.join(OUT, outName), PNG.sync.write(c));
  console.log('кроп:', outName);
}

// A) Заголовок свёрнутой группы: чип «4 активных» vs «6 заказов · 5 100 ₽».
crop(
  'orders-collapsed-light-390.png',
  'collapsed-header.png',
  0,
  130,
  390,
  120,
);

// B) Карточка каталога: точка наличия + бейдж на фото.
crop('catalog-light-390.png', 'card-stockdot.png', 8, 200, 187, 190);
crop('catalog-dark-768.png', 'card-stockdot-dark-768.png', 60, 210, 200, 190);

// C) Прод: строка позиций в карточке заказа (наездание суммы).
crop(
  'seller-orders-grouped-light-390.png',
  'order-items-row.png',
  0,
  400,
  390,
  180,
);
