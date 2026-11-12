/**
 * Пастельные тона заглушек изображений.
 *
 * До подключения настоящих фото (Промт 9+) карточки и галереи
 * показывают плашки спокойных пастельных тонов. Тона намеренно
 * одинаковые в светлой и тёмной теме: «фотография» остаётся светлой
 * независимо от темы — так ведут себя реальные снимки товаров.
 */
export const PLACEHOLDER_TONES = ['#F1E6C9', '#DCE8DC', '#DBE5F2'] as const;

export type PlaceholderTone = (typeof PLACEHOLDER_TONES)[number];

/** Детерминированный тон по индексу (цикл из трёх). */
export function placeholderTone(index: number): PlaceholderTone {
  const i = Math.abs(Math.trunc(index)) % PLACEHOLDER_TONES.length;
  return PLACEHOLDER_TONES[i] ?? PLACEHOLDER_TONES[0];
}
