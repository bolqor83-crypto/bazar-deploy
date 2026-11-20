#!/usr/bin/env node
/**
 * VLM-проверка ключевых кадров «Маршрута по рынку» (Промт 17, B).
 *
 * Замечания по конкретным критериям чек-листа (не gate): схема
 * читается, номера на маркерах, линия маршрута, пунктир возврата,
 * баннер unlocated, тёмная тема, зоны нажатия.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DIR = path.resolve('download/промт17');
const OUT = path.resolve('download/промт17/vlm');
fs.mkdirSync(OUT, { recursive: true });

const PROMPT = `Ты — строгий ревьюер мобильного UI (оптовый рынок, 4 утра,
перчатки, слабый сигнал). Экран «Маршрут по рынку» в B2B-приложении.
Оцени по критериям и ответь ТОЛЬКО JSON без markdown:
{"readable": "да/нет — схема и порядок обхода считываются за 1 секунду",
"markers": "замечание о номерах на маркерах (контраст, размер)",
"line": "замечание о линии маршрута и пунктире возврата",
"list": "замечание о списке остановок (метры, статусы, чекбоксы)",
"banner": "замечание о баннере unlocated (заметен, не кричит)",
"dark": "замечание о тёмной теме (если кадр тёмный, иначе '-')",
"issues": ["конкретные проблемы, если есть"],
"score": 0-100}`;

const SHOTS = [
  ['route-light', '02-market-route-light-390.png'],
  ['map-crop', '12-market-map-crop.png'],
  ['unlocated', '03-market-route-unlocated-banner.png'],
  ['route-dark', '07-market-route-dark-390.png'],
  ['visited', '05-market-route-visited.png'],
];

async function main() {
  for (const [name, file] of SHOTS) {
    const img = path.join(DIR, file);
    if (!fs.existsSync(img)) {
      console.log(`${name}: файл отсутствует`);
      continue;
    }
    const outFile = path.join(OUT, `${name}.json`);
    const args = ['vision', '-p', PROMPT, '-i', img, '-o', outFile];
    try {
      execFileSync('z-ai', args, { stdio: 'pipe', timeout: 120_000 });
      const content = JSON.parse(fs.readFileSync(outFile, 'utf-8')).choices[0]
        .message.content;
      const match = String(content).match(/\{[\s\S]*\}/);
      const verdict = match ? JSON.parse(match[0]) : { raw: content };
      console.log(`\n=== ${name} (${file}) ===`);
      for (const [k, v] of Object.entries(verdict)) {
        console.log(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
      }
    } catch (error) {
      console.log(
        `${name}: ошибка ${String(error.message ?? error).slice(0, 120)}`,
      );
    }
  }
}

main();
