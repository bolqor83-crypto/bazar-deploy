/**
 * Статический тест шкалы типографики (Промт 12, Часть B).
 *
 * Шкала — контракт: размеры/интерлиньяж/вес зафиксированы таблицей
 * ревизии. Правила применения: body (17) — минимум для смыслового
 * текста; caption (14) — подписи; micro (12) — только метки.
 */
import { NUMERIC_VARIANTS, TABULAR_NUMS, typography } from '../typography';

describe('Шкала типографики (ревизия Промта 12)', () => {
  it.each([
    ['display', 32, 40, 700],
    ['h1', 26, 34, 700],
    ['h2', 22, 30, 600],
    ['h3', 18, 26, 600],
    ['numberXl', 32, 40, 700],
    ['numberL', 24, 32, 700],
    ['body', 17, 26, 400],
    ['bodyStrong', 17, 26, 600],
    ['bodySmall', 15, 22, 400],
    ['caption', 14, 20, 400],
    ['micro', 12, 16, 400],
  ] as const)('%s = %s/%s/%s', (name, size, lh, weight) => {
    expect(typography[name].fontSize).toBe(size);
    expect(typography[name].lineHeight).toBe(lh);
    expect(typography[name].fontWeight).toBe(weight);
  });

  it('body — минимум 17pt для смыслового текста', () => {
    expect(typography.body.fontSize).toBeGreaterThanOrEqual(17);
    expect(typography.bodyStrong.fontSize).toBeGreaterThanOrEqual(17);
  });

  it('caption — 14pt: не мельче 13 для подписей', () => {
    expect(typography.caption.fontSize).toBeGreaterThanOrEqual(13);
  });

  it('micro — только метки: единственный вариант мельче caption', () => {
    const smaller = Object.entries(typography).filter(
      ([name, token]) =>
        name !== 'micro' && token.fontSize < typography.caption.fontSize,
    );
    expect(smaller).toEqual([]);
  });

  it('числовые варианты — табличные через Text автоматически', () => {
    expect(NUMERIC_VARIANTS).toEqual(['numberXl', 'numberL']);
    expect(TABULAR_NUMS).toEqual(['tabular-nums']);
  });
});
