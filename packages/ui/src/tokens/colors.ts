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
  // Итерация 4 (VLM-аудит): вторичный текст темнее на ступень —
  // «4 утра, слабый свет» требовал запаса сверх AA.
  textSecondary: '#565E55',
  textMuted: '#5C625A',
  textDisabled: '#B8BDB6',

  // Промт 12, Часть E: не-текстовой контраст рамок ≥ 3:1 (WCAG
  // 1.4.11) — против surface (#FFFFFF), background (#FAF8F4) и
  // surfaceMuted (#F2EFE9). Значения из промта (#C9D2C9/#3E4440)
  // дают лишь 1.5–1.8:1 — см. ADR 0013.
  border: '#818880',
  borderStrong: '#666D66',

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
  // Итерация 4 (VLM-аудит): +2 ступени светлее — серые подписи
  // терялись на тёмном фоне при слабом свете.
  textSecondary: '#C2C8BF',
  textMuted: '#AEB5AC',
  textDisabled: '#5A605A',

  // Промт 12, Часть E: рамки светлее фона до ≥ 3:1 против surface
  // (#1E211F), background (#161917) и surfaceMuted (#252925).
  border: '#6E746F',
  borderStrong: '#878E88',

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
