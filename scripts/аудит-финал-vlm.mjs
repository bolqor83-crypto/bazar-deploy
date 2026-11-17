#!/usr/bin/env node
/**
 * Финальный VLM-аудит Промта 12 (Часть E): 13 эталонных экранов,
 * медиана 3 прогонов, проходной 85/100.
 *
 * Кадры: golden-скриншоты docs/visual-golden (склад, инструменты,
 * типографика) + витрина форм из download/промт12/audit.
 *
 * Запуск: node scripts/аудит-финал-vlm.mjs [группа]
 *   группы: stock | tools | forms | typo — чанками по таймауту bash.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const GOLDEN = path.resolve('docs/visual-golden');
const FORMS = path.resolve('download/промт12/audit');
const PREVIEW = path.resolve('download/промт12/preview');
const OUT_DIR = path.resolve('download/промт12/audit-final');
fs.mkdirSync(OUT_DIR, { recursive: true });

/** Аудит-наборы: имя → файлы-кадры. */
const GROUPS = {
  stock: {
    // Полный список позиций (без поискового фильтра золотых кадров):
    // golden-кадры с фильтром «Голден склад» выглядят пустыми.
    'stock-overview': [
      `${PREVIEW}/stock-overview-light.png`,
      `${PREVIEW}/stock-overview-dark.png`,
    ],
    'stock-detail': [
      `${PREVIEW}/stock-detail-light.png`,
      `${GOLDEN}/stock-detail-dark-390.png`,
    ],
    'stock-movement-form': [`${PREVIEW}/stock-movement-light.png`],
    'stock-transfer-form': [`${GOLDEN}/stock-transfer-form-light-390.png`],
  },
  tools: {
    'tools-more': [
      `${GOLDEN}/tools-more-light-390.png`,
      `${GOLDEN}/tools-more-dark-390.png`,
    ],
  },
  forms: {
    'form-select': [
      `${FORMS}/forms-3-select-open.png`,
      `${FORMS}/forms-1-select-checkbox.png`,
    ],
    'form-checkbox': [`${FORMS}/forms-1-select-checkbox.png`],
    'form-radio': [`${FORMS}/forms-2-radio-switch.png`],
    'form-switch': [`${FORMS}/forms-2-radio-switch.png`],
    'form-datepicker': [`${FORMS}/forms-4-datepicker-open.png`],
  },
  typo: {
    'typo-catalog': [
      `${GOLDEN}/catalog-light-390.png`,
      `${GOLDEN}/catalog-dark-390.png`,
    ],
    'typo-orders': [`${GOLDEN}/orders-light-390.png`],
    'typo-profile': [`${GOLDEN}/profile-customer-light-390.png`],
  },
};

const PROMPT = `Ты строгий аудитор визуального дизайна мобильных приложений. Перед тобой ОДИН или ДВА кадра ОДНОГО экрана B2B-приложения Bazar (React Native, 390px). Позиционирование: Stripe / Linear / Shopify admin — рабочий инструмент профессионала, не «дешёвый маркетплейс» и не ERP. Операционный контекст: пользователь на рынке в 4 утра, в перчатках, при слабом свете.

Оцени по 10 критериям, каждый 0-10 (если кадров два — состояния оценивай по обоим):
1. hierarchy — иерархия: главное видно сразу
2. typography — типографика, контраст, tabular-nums для цифр
3. color — спокойная палитра, без красного (терракота ок)
4. grid — сетка, выравнивание, отступы
5. components — целостность карточек/полей/кнопок
6. icons — уместность и единый стиль
7. states — пустые состояния, подсказки, ошибки, disabled
8. density — рабочая плотность, не пустота и не теснота
9. a11y — зоны нажатия >=48px, читабельность, контраст рамок
10. impression — впечатление профессионального продукта

Ответь СТРОГО одной строкой JSON без markdown:
{"hierarchy":N,"typography":N,"color":N,"grid":N,"components":N,"icons":N,"states":N,"density":N,"a11y":N,"impression":N,"total":N,"notes":"1-2 главные проблемы на русском"}`;

/** Пауза (мс). */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Один вызов z-ai vision → JSON-оценка (с ретраями на 429). */
async function auditOnce(name, run, images) {
  const outFile = path.join(OUT_DIR, `${name}-run${run}.json`);
  if (fs.existsSync(outFile)) {
    try {
      return JSON.parse(fs.readFileSync(outFile, 'utf-8')).choices[0].message
        .content;
    } catch {
      // перезапишем
    }
  }
  const args = ['vision', '-p', PROMPT];
  for (const img of images) args.push('-i', img);
  args.push('-o', outFile);
  let lastError = null;
  // 429 у z-ai бывают затяжными: до 8 попыток с растущими паузами.
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      execFileSync('z-ai', args, { stdio: 'pipe', timeout: 120_000 });
      return JSON.parse(fs.readFileSync(outFile, 'utf-8')).choices[0].message
        .content;
    } catch (error) {
      lastError = error;
      const is429 = String(error.message ?? '').includes('429');
      if (!is429) throw error;
      console.log(`  429, ждём ${attempt * 30}с…`);
      await sleep(attempt * 30_000);
    }
  }
  throw lastError;
}

/** Медиана массива. */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Разбор строки JSON из ответа модели. */
function parseVerdict(raw) {
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const verdict = JSON.parse(match[0]);
    if (!verdict || typeof verdict.total !== 'number') return null;
    // Модель иногда отвечает по шкале 0–10 вместо 0–100 —
    // нормализуем, иначе медиана ломается (6.8 рядом с 68).
    if (verdict.total <= 10) {
      verdict.total = Math.round(verdict.total * 10);
    }
    return verdict;
  } catch {
    return null;
  }
}

const which = process.argv[2] ?? 'stock';
const items = GROUPS[which];
if (!items) {
  console.error('группы: stock | tools | forms | typo');
  process.exit(1);
}

const report = {};
for (const [name, images] of Object.entries(items)) {
  const totals = [];
  const notes = [];
  for (let run = 1; run <= 3; run += 1) {
    const raw = await auditOnce(name, run, images);
    const verdict = parseVerdict(raw);
    if (!verdict || typeof verdict.total !== 'number') {
      console.log(`${name} прогон ${run}: НЕ РАЗОБРАН`);
      continue;
    }
    totals.push(verdict.total);
    if (verdict.notes) notes.push(verdict.notes);
    console.log(`${name} прогон ${run}: ${verdict.total}`);
  }
  if (totals.length === 0) continue;
  const med = median(totals);
  report[name] = { median: med, runs: totals, notes: notes[0] ?? '' };
  console.log(`${name}: МЕДИАНА ${med} ${med >= 85 ? 'PASS' : 'FAIL'}`);
}

fs.writeFileSync(
  path.join(OUT_DIR, `report-${which}.json`),
  JSON.stringify(report, null, 2),
);
console.log(`\n=== группа ${which}: готово ===`);
