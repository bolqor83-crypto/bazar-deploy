/**
 * Цветовые токены Bazar.
 *
 * Правила:
 * - Красный запрещён (никаких #FF0000/#E74C3C/#DC3545).
 *   Опасные состояния — терракота, предупреждения — янтарь.
 * - Пары «текст/фон» проходят WCAG AA ≥ 4.5:1 (см. __tests__/contrast.test.ts
 *   и download/контраст-таблица.txt с фактическими коэффициентами).
 * - Значения light-темы для textSecondary/textMuted/accent/danger/success/info
 *   скорректированы относительно исходного макета ради AA — семантика сохранена
 *   (решение подтверждено по отчёту Промта 2).
 */

export const colorsLight = {
  background: '#FAF8F4',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F2EFE9',

  primary: '#2E6B4E',
  primaryText: '#2E6B4E',
  primarySoft: '#E7F2EB',
  primaryPressed: '#255A41',
  onPrimary: '#FFFFFF',

  accent: '#8A6519',
  accentSoft: '#F8F1D9',
  onAccent: '#FFFFFF',

  danger: '#9F4C3B',
  dangerSoft: '#F5E4DF',
  onDanger: '#FFFFFF',

  success: '#2B7B58',
  successSoft: '#E3F1EA',

  info: '#2F69AB',
  infoSoft: '#E6EEF7',

  text: '#1A1A17',
  textSecondary: '#666D64',
  textMuted: '#6C716A',
  textDisabled: '#B8BDB6',

  border: '#E4EAE4',
  borderStrong: '#C9D2C9',

  overlay: 'rgba(0, 0, 0, 0.45)',
} as const;

export const colorsDark = {
  background: '#161917',
  backgroundElevated: '#1E211F',
  surface: '#1E211F',
  surfaceMuted: '#252925',

  primary: '#2E6B4E',
  primaryText: '#7FB894',
  primarySoft: '#1F3D2D',
  primaryPressed: '#3A7E5C',
  onPrimary: '#FFFFFF',

  accent: '#D89A2E',
  accentSoft: '#3A2E14',
  onAccent: '#1A1A17',

  danger: '#D67562',
  dangerSoft: '#3A211C',
  onDanger: '#1A1A17',

  success: '#5BB985',
  successSoft: '#1B3327',

  info: '#5FA0DC',
  infoSoft: '#17273A',

  text: '#F0EDE8',
  textSecondary: '#A8AFA6',
  textMuted: '#878E84',
  textDisabled: '#5A605A',

  border: '#2A2E2B',
  borderStrong: '#3E4440',

  overlay: 'rgba(0, 0, 0, 0.65)',
} as const;

/** Тип цветовой палитры (ключи light и dark совпадают, значения — строки). */
export type ColorPalette = { [K in keyof typeof colorsLight]: string };

/** Имя цвета из палитры. */
export type ColorToken = keyof ColorPalette;

export const colors = {
  light: colorsLight,
  dark: colorsDark,
} as const;
