/**
 * Токены анимаций Bazar.
 *
 * Длительности: fast 150 / base 220 / slow 300 мс.
 * Пружины: base — мягкая (шиты, диалоги), quick — быстрая (мелкие элементы).
 * При prefers-reduced-motion длительности обнуляются (см. useDurationMs).
 */
import { Easing, type EasingFunction } from 'react-native-reanimated';

export const durations = {
  fast: 150,
  base: 220,
  slow: 300,
} as const;

export type DurationToken = keyof typeof durations;

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export const springs = {
  /** Мягкая пружина для шитов и диалогов. */
  base: { stiffness: 200, damping: 22, mass: 1 } as SpringConfig,
  /** Быстрая пружина для мелких элементов. */
  quick: { stiffness: 300, damping: 26, mass: 1 } as SpringConfig,
};

export const easings: {
  outQuad: EasingFunction;
  outCubic: EasingFunction;
} = {
  outQuad: Easing.out(Easing.quad),
  outCubic: Easing.out(Easing.cubic),
};
