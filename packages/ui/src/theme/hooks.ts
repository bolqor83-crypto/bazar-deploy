/**
 * Хуки доступа к теме и токенам дизайн-системы.
 */
import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import {
  colorsDark,
  colorsLight,
  type ColorPalette,
  durations,
  type DurationToken,
  radii,
  shadowsDark,
  shadowsLight,
  spacing,
  typography,
} from '../tokens';
import { useSystemSchemeStore } from './systemScheme';
import { useThemeStore, type ThemeMode } from './themeStore';

/** Полный набор токенов для текущей темы. */
export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorPalette;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  shadows: typeof shadowsLight;
}

/** Главный хук темы: режим, палитра и все токены. */
export function useTheme(): Theme {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useSystemSchemeStore((s) => s.scheme);
  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  return useMemo(
    () => ({
      mode,
      isDark,
      colors: isDark ? colorsDark : colorsLight,
      spacing,
      radii,
      typography,
      shadows: isDark ? shadowsDark : shadowsLight,
    }),
    [mode, isDark]
  );
}

/** Палитра текущей темы. */
export function useThemeColors(): ColorPalette {
  return useTheme().colors;
}

/** Типографика. */
export function useTypography(): typeof typography {
  return typography;
}

/** Отступы. */
export function useSpacing(): typeof spacing {
  return spacing;
}

/**
 * Длительность анимации с учётом prefers-reduced-motion:
 * при включённой настройке длительность обнуляется.
 */
export function useDurationMs(token: DurationToken): number {
  const reducedMotion = useReducedMotion() ?? false;
  return reducedMotion ? 0 : durations[token];
}
