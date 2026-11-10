/**
 * Радиусы скругления Bazar.
 */
export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radii;
