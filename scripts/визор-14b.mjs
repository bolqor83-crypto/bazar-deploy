#!/usr/bin/env node
/**
 * VLM-проверка Промта 14b (§7.3) — вспомогательный сигнал, НЕ gate.
 *
 * 6 ключевых кадров: каталог/товар/профиль × light/dark (390px).
 * Вопросы — про КОНКРЕТНЫЕ дефекты (нечитаемый текст, обрезанные
 * элементы, съехавшие отступы, наложения), не про балл: плато
 * 72–82 — шум грейдера, а не сигнал (Промт 14b, §1).
 *
 * Запуск: node scripts/визор-14b.mjs (кадры уже сняты в
 * download/промт14b/чек-лист).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SRC = path.resolve('download/промт14b/чек-лист');
const OUT_DIR = path.resolve('download/промт14b/vlm');
fs.mkdirSync(OUT_DIR, { recursive: true });

const FRAMES = [
  'catalog-light-390.png',
  'catalog-dark-390.png',
  'product-light-390.png',
  'product-dark-390.png',
  'profile-light-390.png',
  'profile-dark-390.png',
];

const PROMPT = `Перед тобой кадр мобильного приложения Bazar (оптовый аграрный рынок, 390px). Новый редизайн 14b: тёплый светлый фон, изумрудный акцент, фото 1:1, увеличенные отступы, карточки с мягкой тенью.

Найди ТОЛЬКО конкретные визуальные ДЕФЕКТЫ:
1. текст, который не читается (слишком бледный, мелкий, наложение)
2. обрезанные элементы (кнопка, текст, фото выходят за границы)
3. съехавшие отступы (элемент прижат к краю, налезает на соседний)
4. наложения элементов друг на друга
5. сломанное выравнивание сетки

Если дефектов нет — напиши ровно: "дефектов нет".
Не давай оценок, впечатлений и рекомендаций. Только список дефектов
с указанием места на экране, по-русски, максимум 3 пункта.`;

async function main() {
  for (const frame of FRAMES) {
    const inFile = path.join(SRC, frame);
    const outFile = path.join(OUT_DIR, `${frame.replace('.png', '')}.json`);
    if (!fs.existsSync(inFile)) {
      console.log(`нет кадра: ${frame}`);
      continue;
    }
    if (fs.existsSync(outFile)) {
      const cached = JSON.parse(fs.readFileSync(outFile, 'utf-8'));
      console.log(`\n=== ${frame} (кэш) ===`);
      console.log(cached.choices[0].message.content);
      continue;
    }
    try {
      execFileSync(
        'z-ai',
        ['vision', '-p', PROMPT, '-i', inFile, '-o', outFile],
        { stdio: 'pipe', timeout: 120_000 },
      );
      const verdict = JSON.parse(fs.readFileSync(outFile, 'utf-8'));
      console.log(`\n=== ${frame} ===`);
      console.log(verdict.choices[0].message.content);
    } catch (error) {
      console.log(`\n=== ${frame}: ошибка ${error.message?.slice(0, 120)} ===`);
    }
  }
}

main();
