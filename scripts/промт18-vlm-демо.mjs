#!/usr/bin/env node
/**
 * VLM-проверка демо-кадров ПРОМТА 18 (скриншоты с прода,
 * сделанные scripts/промт18-демо.mjs). Не гейт — материал
 * для финального отчёта.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DIR = path.resolve('/home/z/my-project/download/промт18');
const OUT = path.join(DIR, 'vlm');
fs.mkdirSync(OUT, { recursive: true });

const PROMPT = `Ты — строгий ревьюер мобильного UI (оптовый рынок, 4 утра,
перватки, слабый сигнал). Ответь ТОЛЬКО JSON без markdown:
{"readable": "да/нет — экран читается за 1 секунду",
"content": "что конкретно видно на экране (секции, цифры)",
"issues": ["конкретные проблемы, если есть"],
"score": 0-100}`;

const SHOTS = [
  ['demo-analytics-light', '01-analytics-light-390.png'],
  ['demo-analytics-dark', '02-analytics-dark-390.png'],
  ['demo-analytics-360', '03-analytics-light-360.png'],
  ['demo-trends-crop', '05-analytics-trends-crop.png'],
  ['demo-empty', '07-analytics-empty-390.png'],
  ['demo-toast', '08-dev-logs-toast.png'],
  ['demo-dev-logs', '10-dev-logs.png'],
];

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
