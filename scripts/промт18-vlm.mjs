#!/usr/bin/env node
/**
 * VLM-проверка новых golden-кадров ПРОМТА 18 (D):
 * аналитика (light/dark), dev-logs, переснятые заказы.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DIR = path.resolve('docs/visual-golden');
const OUT = path.resolve('download/промт18/vlm');
fs.mkdirSync(OUT, { recursive: true });

const PROMPT = `Ты — строгий ревьюер мобильного UI (оптовый рынок, 4 утра,
перчатки, слабый сигнал). Ответь ТОЛЬКО JSON без markdown:
{"readable": "да/нет — экран читается за 1 секунду",
"content": "что конкретно видно на экране (секции, цифры)",
"numbers": "замечание о цифрах: крупные, tabular, читаются ли",
"issues": ["конкретные проблемы, если есть"],
"score": 0-100}`;

const SHOTS = [
  ['analytics-light', 'seller-analytics-light-390.png'],
  ['analytics-dark', 'seller-analytics-dark-390.png'],
  ['dev-logs', 'dev-logs-light-390.png'],
  ['orders-light', 'orders-light-390.png'],
];

async function main() {
  for (const [name, file] of SHOTS) {
    const img = path.join(DIR, file);
    if (!fs.existsSync(img)) {
      console.log(`${name}: файл отсутствует`);
      continue;
    }
    const outFile = path.join(OUT, `${name}.json`);
    try {
      execFileSync('z-ai', ['vision', '-p', PROMPT, '-i', img, '-o', outFile], {
        stdio: 'pipe',
        timeout: 120_000,
      });
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
