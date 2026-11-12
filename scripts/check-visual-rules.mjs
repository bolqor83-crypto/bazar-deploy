#!/usr/bin/env node
/**
 * Проверка визуальных правил Bazar (Промт 8, Часть D).
 *
 * Статический линт исходников мобильного приложения и дизайн-системы:
 * 1. Красный запрещён: #FF0000, #E74C3C, #DC3545 (опасное — терракота).
 * 2. ActivityIndicator/Spinner запрещены: загрузка — только Skeleton.
 * 3. Эмодзи в UI-строках запрещены: иконки — только Lucide.
 * 4. fontSize < 15 в экранах — предупреждение (основной текст ≥ 17).
 *
 * Особенности:
 * - комментарии вырезаются до проверки (там бывают легитимные
 *   упоминания правил и стрелки «→»);
 * - тест-файлы не проверяются на цвета и эмодзи: тесты легитимно
 *   ассертят отсутствие запрещённого и используют стрелки в названиях.
 *
 * Запуск: node scripts/check-visual-rules.mjs  (или pnpm lint:visual)
 * Код выхода 1 — есть нарушения. Работает без зависимостей.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const TARGETS = ['apps/mobile/src', 'packages/ui/src'];

/** Красные, запрещённые правилами проекта. */
const FORBIDDEN_RED = /#(ff0000|e74c3c|dc3545)\b/i;
/** Индикаторы загрузки — только Skeleton. */
const FORBIDDEN_SPINNER = /\bActivityIndicator\b|\bSpinner\b/;
/** Эмодзи-пиктограммы (без стрелок и типографики). */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
/** Жёсткий размер шрифта меньше 15 в экранах (caption = 13 живёт в токенах). */
const SMALL_FONT = /fontSize:\s*(\d+)/g;

const errors = [];
const warnings = [];

/** Убирает блочные и строчные комментарии из строки. */
function stripComments(line) {
  return line
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/g, '')
    .replace(/^\s*\*.*$/g, '');
}

/** Рекурсивный обход каталога с исходниками. */
function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

for (const target of TARGETS) {
  const base = join(ROOT, target);
  let files;
  try {
    files = walk(base);
  } catch {
    warnings.push(`каталог ${target} не найден — пропуск`);
    continue;
  }

  for (const file of files) {
    const rel = relative(ROOT, file);
    const isTest = /\.(test|spec)\.[jt]sx?$/.test(file);
    const content = readFileSync(file, 'utf8');

    content.split('\n').forEach((rawLine, index) => {
      const line = stripComments(rawLine);
      if (line.trim().length === 0) {
        return;
      }
      const place = `${rel}:${index + 1}`;

      // 1. Красный (не в тестах: там ассертят отсутствие)
      if (!isTest && FORBIDDEN_RED.test(line)) {
        errors.push(`${place}: запрещённый красный цвет (${line.trim()})`);
      }

      // 2. Спиннеры (везде, включая тесты)
      if (FORBIDDEN_SPINNER.test(line)) {
        errors.push(
          `${place}: ActivityIndicator/Spinner запрещены — используйте Skeleton`,
        );
      }

      // 3. Эмодзи (не в тестах: в названиях кейсов бывают стрелки)
      if (!isTest && EMOJI.test(line)) {
        errors.push(
          `${place}: эмодзи в коде запрещены — иконки Lucide (${line.trim()})`,
        );
      }

      // 4. Мелкий шрифт в экранах (не в дизайн-системе)
      if (target === 'apps/mobile/src' && !isTest) {
        for (const match of line.matchAll(SMALL_FONT)) {
          const size = Number(match[1]);
          if (size < 15) {
            warnings.push(
              `${place}: fontSize ${size} < 15 — используйте токены типографики`,
            );
          }
        }
      }
    });
  }
}

for (const warning of warnings) {
  console.warn(`ПРЕДУПРЕЖДЕНИЕ: ${warning}`);
}
for (const error of errors) {
  console.error(`ОШИБКА: ${error}`);
}

console.log(
  `\nВизуальные правила: ${errors.length} ошибок, ${warnings.length} предупреждений`,
);

if (errors.length > 0) {
  process.exit(1);
}
