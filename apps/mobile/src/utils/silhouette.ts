/**
 * resolveSilhouette — ключ силуэта по названию товара
 * (Промт 16, Часть A).
 *
 * Бизнес-слой: UI-пакет не знает, как выглядят товары, — он
 * рисует силуэт по ключу. Соответствие «название → силуэт»
 * живёт здесь, рядом с доменом мобильного приложения.
 *
 * Правила:
 * - поиск по подстроке (корню слова), регистронезависимо;
 * - русские и украинские корни (свинина → нет: только продукция);
 * - ё/е эквивалентны (свёкл/свекл, мёд/мед);
 * - неизвестное название → crate (ящик) — универсальный fallback.
 *
 * Ограничение (осознанное, ADR 0016): новый товар продавца
 * с названием вне словаря получит crate. Выбор силуэта в форме
 * создания товара — открытый вопрос, НЕ реализуется.
 */
import type { SilhouetteKey } from '@bazar/ui';

/** Пары «паттерн → силуэт» в порядке приоритета. */
const PATTERNS: readonly { pattern: RegExp; key: SilhouetteKey }[] = [
  { pattern: /картоф/, key: 'potato' },
  { pattern: /помидор|томат/, key: 'tomato' },
  { pattern: /огур/, key: 'cucumber' },
  { pattern: /перец/, key: 'pepper' },
  { pattern: /баклажан/, key: 'eggplant' },
  { pattern: /кабач/, key: 'zucchini' },
  { pattern: /морков/, key: 'carrot' },
  { pattern: /свёкл|свекл/, key: 'beet' },
  { pattern: /лук/, key: 'onion' },
  { pattern: /капуст/, key: 'cabbage' },
  { pattern: /яблок/, key: 'apple' },
  { pattern: /груш/, key: 'pear' },
  { pattern: /апельсин|мандарин|лимон/, key: 'citrus' },
  { pattern: /виноград/, key: 'grapes' },
  { pattern: /банан/, key: 'banana' },
  {
    pattern: /укроп|петруш|кинз|руккол|базил/,
    key: 'greensBunch',
  },
  { pattern: /салат|айсберг/, key: 'lettuceHead' },
  {
    pattern: /рис|греч|пшен|хлоп|овся|круп|зерн/,
    key: 'grainSack',
  },
  { pattern: /молок|кефир/, key: 'milkBottle' },
  { pattern: /творог/, key: 'curdTub' },
  { pattern: /сыр/, key: 'cheeseWedge' },
  // После нормализации ё→е: «мёд» и «мед» дают один корень «мед».
  { pattern: /мед/, key: 'honeyJar' },
  { pattern: /орех/, key: 'nuts' },
];

/** Ключ силуэта по названию товара; иначе crate. */
export function resolveSilhouette(title: string): SilhouetteKey {
  // Нормализация: lowercase, ё → е (свёкла/свекла, мёд/мед).
  const normalized = title.toLowerCase().replace(/ё/g, 'е');
  for (const { pattern, key } of PATTERNS) {
    if (pattern.test(normalized)) {
      return key;
    }
  }
  return 'crate';
}
