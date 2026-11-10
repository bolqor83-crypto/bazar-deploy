/**
 * Типографика Bazar. Шрифт Inter (expo-google-fonts/inter).
 *
 * Правила операционного контекста (4 утра, перчатки, слабый свет):
 * основной текст ≥ 17pt. Табличные цифры — через mono (tabular-nums).
 */

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyStrong'
  | 'bodySmall'
  | 'caption'
  | 'micro';

export type FontWeight = 400 | 500 | 600 | 700;

export interface TypographyVariant {
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeight;
  letterSpacing: number;
  /** Имя шрифта Inter, загруженного через expo-google-fonts. */
  fontFamily: string;
}

/** Маппинг веса на имя загруженного начертания Inter. */
const interFamily: Record<FontWeight, string> = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
};

function variant(
  fontSize: number,
  lineHeight: number,
  fontWeight: FontWeight,
  letterSpacing: number
): TypographyVariant {
  return {
    fontSize,
    lineHeight,
    fontWeight,
    letterSpacing,
    fontFamily: interFamily[fontWeight],
  };
}

export const typography: Record<TextVariant, TypographyVariant> = {
  display: variant(32, 40, 700, -0.5),
  h1: variant(28, 36, 700, -0.3),
  h2: variant(22, 30, 600, -0.2),
  h3: variant(18, 26, 600, 0),
  body: variant(17, 26, 400, 0),
  bodyStrong: variant(17, 26, 600, 0),
  bodySmall: variant(15, 22, 400, 0),
  caption: variant(13, 18, 400, 0),
  micro: variant(12, 16, 400, 0),
};

/** Значение fontVariant для табличных цифр. */
export const TABULAR_NUMS = ['tabular-nums'] as const;
