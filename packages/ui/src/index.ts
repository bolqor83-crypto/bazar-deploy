/**
 * Публичный API дизайн-системы Bazar.
 */

// Токены
export {
  colors,
  colorsDark,
  colorsLight,
  durations,
  easings,
  radii,
  shadowsDark,
  shadowsLight,
  spacing,
  springs,
  TABULAR_NUMS,
  typography,
  hapticTap,
  hapticSuccess,
  hapticWarning,
  hapticError,
  hapticSelection,
  shadowStyle,
  __resetHapticThrottleForTests,
} from './tokens';
export type {
  ColorPalette,
  ColorToken,
  DurationToken,
  FontWeight,
  RadiusToken,
  ShadowLevel,
  ShadowToken,
  SpacingToken,
  SpringConfig,
  TextVariant,
  TypographyVariant,
} from './tokens';

// Тема
export {
  ThemeProvider,
  THEME_STORAGE_KEY,
  useDurationMs,
  useSpacing,
  useSystemSchemeStore,
  useTheme,
  useThemeColors,
  useThemeStore,
  useTypography,
} from './theme';
export type { SystemScheme, Theme, ThemeMode } from './theme';

// Провайдеры
export { BazarUIProvider } from './providers';

// Компоненты
export { Text } from './components/Text';
export type { TextProps } from './components/Text';

export { Button } from './components/Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './components/Button';

export { IconButton } from './components/IconButton';
export type { IconButtonProps, IconButtonSize, IconButtonVariant } from './components/IconButton';

export { Input } from './components/Input';
export type { InputProps } from './components/Input';

export { Card } from './components/Card';
export type { CardProps, CardVariant } from './components/Card';

export { Badge } from './components/Badge';
export type { BadgeProps, BadgeSize, BadgeVariant } from './components/Badge';

export { Skeleton } from './components/Skeleton';
export type { SkeletonProps } from './components/Skeleton';

export { EmptyState } from './components/EmptyState';
export type { EmptyStateAction, EmptyStateProps } from './components/EmptyState';

export { ErrorState } from './components/ErrorState';
export type { ErrorStateProps } from './components/ErrorState';

export { Divider } from './components/Divider';
export type { DividerInset, DividerOrientation, DividerProps } from './components/Divider';

export { Dialog } from './components/Dialog';
export type { DialogProps } from './components/Dialog';

export { ToastProvider, useToast, useToastStore } from './components/Toast';
export type { ToastData, ToastInput, ToastProviderProps, ToastVariant } from './components/Toast';
