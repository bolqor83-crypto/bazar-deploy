#!/usr/bin/env node
/**
 * VLM-аудит экранов доставок (Промт 10, Часть D).
 * 3 независимых прогона на экран, медиана; критерии Промта 8 §2.2.
 * Запуск: node scripts/audit-delivery.mjs (сервер не нужен —
 * оцениваются golden-снимки docs/visual-golden).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const GOLDEN = path.resolve('docs/visual-golden');
const OUT = path.resolve('download/промт10-D/аудит');
fs.mkdirSync(OUT, { recursive: true });

const SCREENS = [
  'carrier-feed-light-390',
  'carrier-my-deliveries-light-390',
  'carrier-delivery-detail-light-390',
  'order-with-delivery-light-390',
];

const PROMPT = [
  'Оцени скриншот мобильного экрана приложения Bazar (рынок оптовой торговли,',
  'роль перевозчика/покупателя) по 10 критериям, каждый 0–10:',
  '1) визуальная иерархия; 2) типографика и читаемость; 3) цвет и контраст',
  '(WCAG AA, чистый красный запрещён); 4) сетка и выравнивание; 5) компоненты',
  '(карточки, кнопки, бейджи); 6) иконки; 7) информативность (подсказки,',
  'пустые состояния, числа табличными цифрами); 8) плотность и размеры целей',
  '(сценарий: работа в перчатках на улице, слабый сигнал — цели ≥48px,',
  'основной текст ≥17pt); 9) доступность (a11y-подписи, контраст);',
  '10) общее впечатление рабочего инструмента.',
  'Ответь СТРОГО одним JSON без markdown:',
  '{"scores":[10 чисел],"total":сумма,"issues":["замечание", ...]}',
].join(' ');

function runOnce(image, outPath) {
  execFileSync('z-ai', ['vision', '-p', PROMPT, '-i', image, '-o', outPath], {
    stdio: 'pipe',
    timeout: 120_000,
  });
  const raw = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
  const content = raw.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content);
  return parsed;
}

const summary = [];
for (const name of SCREENS) {
  const runs = [];
  for (let i = 1; i <= 3; i += 1) {
    const outPath = path.join(OUT, `${name}-run${i}.json`);
    try {
      const result = runOnce(path.join(GOLDEN, `${name}.png`), outPath);
      runs.push(result.total ?? 0);
      console.info(
        `${name} run${i}: ${result.total} issues=${result.issues?.length ?? 0}`,
      );
    } catch (e) {
      console.error(
        `${name} run${i} ошибка: ${String(e.message).slice(0, 160)}`,
      );
      runs.push(null);
    }
  }
  const valid = runs.filter((r) => r !== null).sort((a, b) => a - b);
  const median = valid.length > 0 ? valid[Math.floor(valid.length / 2)] : null;
  summary.push({ name, runs, median });
}

fs.writeFileSync(path.join(OUT, 'итог.json'), JSON.stringify(summary, null, 2));
console.info('\n--- итог ---');
for (const s of summary) {
  console.info(`${s.name}: ${s.runs.join(' / ')} → медиана ${s.median}`);
}
