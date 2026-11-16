/**
 * Проверка контраста WCAG AA для всех смысловых пар «текст/фон»
 * в обеих темах + не-текстовой контраст рамок (1.4.11).
 *
 * Относительная яркость и коэффициент контраста считаются вручную
 * по формулам WCAG 2.1 (https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html),
 * без внешних библиотек.
 *
 * Порог: 4.5:1 для обычного текста, 3:1 для крупного и для рамок
 * полей в покое (Промт 12, Часть E — закрытый долг ADR 0002,
 * см. ADR 0013).
 */
import { colorsDark, colorsLight, type ColorPalette } from '../../tokens';

/** sRGB-компонента (0–255) → линейное значение. */
function srgbChannelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Относительная яркость цвета #RRGGBB. */
function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

/** Коэффициент контраста двух цветов. */
function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Порог WCAG AA для обычного текста. */
const AA_NORMAL = 4.5;
/** Порог WCAG 1.4.11 для не-текстовых элементов (рамки). */
const AA_NON_TEXT = 3;

type PairName =
  | 'text/background'
  | 'textSecondary/surface'
  | 'textMuted/surface'
  | 'onPrimary/primary'
  | 'onDanger/danger'
  | 'onAccent/accent'
  | 'primaryText/surface'
  | 'danger/surface'
  | 'success/surface'
  | 'info/surface'
  | 'accent/surface';

type BorderPairName =
  | 'border/surface'
  | 'border/background'
  | 'border/surfaceMuted'
  | 'borderStrong/surface';

const PAIRS: readonly [PairName, keyof ColorPalette, keyof ColorPalette][] = [
  ['text/background', 'text', 'background'],
  ['textSecondary/surface', 'textSecondary', 'surface'],
  ['textMuted/surface', 'textMuted', 'surface'],
  ['onPrimary/primary', 'onPrimary', 'primary'],
  ['onDanger/danger', 'onDanger', 'danger'],
  ['onAccent/accent', 'onAccent', 'accent'],
  ['primaryText/surface', 'primaryText', 'surface'],
  ['danger/surface', 'danger', 'surface'],
  ['success/surface', 'success', 'surface'],
  ['info/surface', 'info', 'surface'],
  ['accent/surface', 'accent', 'surface'],
];

/** Рамки против всех смежных фонов (WCAG 1.4.11, Промт 12). */
const BORDER_PAIRS: readonly [
  BorderPairName,
  keyof ColorPalette,
  keyof ColorPalette,
][] = [
  ['border/surface', 'border', 'surface'],
  ['border/background', 'border', 'background'],
  ['border/surfaceMuted', 'border', 'surfaceMuted'],
  ['borderStrong/surface', 'borderStrong', 'surface'],
];

describe('Контраст WCAG AA', () => {
  describe('светлая тема', () => {
    it.each(PAIRS)('%s ≥ 4.5:1', (_name, fg, bg) => {
      const ratio = contrastRatio(colorsLight[fg], colorsLight[bg]);
      expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
    });
  });

  describe('тёмная тема', () => {
    it.each(PAIRS)('%s ≥ 4.5:1', (_name, fg, bg) => {
      const ratio = contrastRatio(colorsDark[fg], colorsDark[bg]);
      expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
    });
  });

  describe('рамки полей — не-текстовой контраст ≥ 3:1 (WCAG 1.4.11)', () => {
    it.each(BORDER_PAIRS)('light: %s', (_name, fg, bg) => {
      const ratio = contrastRatio(colorsLight[fg], colorsLight[bg]);
      expect(ratio).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });

    it.each(BORDER_PAIRS)('dark: %s', (_name, fg, bg) => {
      const ratio = contrastRatio(colorsDark[fg], colorsDark[bg]);
      expect(ratio).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });
  });

  it('красные цвета запрещены правилами проекта', () => {
    const forbidden = ['#FF0000', '#E74C3C', '#DC3545'];
    const collect = (palette: ColorPalette): string[] =>
      Object.values(palette).filter(
        (v) => typeof v === 'string' && v.startsWith('#'),
      );
    const all = [...collect(colorsLight), ...collect(colorsDark)];
    for (const value of all) {
      expect(forbidden).not.toContain(value.toUpperCase());
    }
  });
});
