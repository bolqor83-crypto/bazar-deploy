/**
 * Тени Bazar.
 *
 * Light-тема: настоящие тени (три уровня).
 * Dark-тема: теней нет — на тёмном фоне компоненты отделяются
 * границей borderWidth 1 с цветом border (см. ADR 0002).
 */
import type { ViewStyle } from 'react-native';

export interface ShadowToken {
  /** Стиль тени для iOS. */
  ios: Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius'>;
  /** Стиль для Android (elevation). */
  android: Pick<ViewStyle, 'elevation'>;
}

export const shadowsLight: Record<'sm' | 'md' | 'lg', ShadowToken> = {
  sm: {
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
  },
  md: {
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 6 },
  },
  lg: {
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.1,
      shadowRadius: 32,
    },
    android: { elevation: 12 },
  },
};

/** В dark-теме тени отключены; вместо них — граница. */
export const shadowsDark: Record<'sm' | 'md' | 'lg', ShadowToken> = {
  sm: { ios: {}, android: {} },
  md: { ios: {}, android: {} },
  lg: { ios: {}, android: {} },
};

export type ShadowLevel = 'sm' | 'md' | 'lg';

/** Объединённый стиль, готовый к растягиванию в стили компонента. */
export function shadowStyle(level: ShadowLevel, isDark: boolean): ViewStyle {
  if (isDark) {
    return {};
  }
  const token = shadowsLight[level];
  return { ...token.ios, ...token.android };
}
