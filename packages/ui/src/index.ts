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
  PLACEHOLDER_TONES,
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
  placeholderTone,
  shadowStyle,
  __resetHapticThrottleForTests,
} from './tokens';
export type {
  ColorPalette,
  ColorToken,
  DurationToken,
  FontWeight,
  PlaceholderTone,
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
export type {
  ButtonProps,
  ButtonSize,
  ButtonVariant,
} from './components/Button';

export { IconButton } from './components/IconButton';
export type {
  IconButtonProps,
  IconButtonSize,
  IconButtonVariant,
} from './components/IconButton';

export { Input } from './components/Input';
export type { InputProps } from './components/Input';

export { Card } from './components/Card';
export type { CardProps, CardVariant } from './components/Card';

export { Badge } from './components/Badge';
export type { BadgeProps, BadgeSize, BadgeVariant } from './components/Badge';

export { Skeleton } from './components/Skeleton';
export type { SkeletonProps } from './components/Skeleton';

export { EmptyState } from './components/EmptyState';
export type {
  EmptyStateAction,
  EmptyStateProps,
} from './components/EmptyState';

export { ErrorState } from './components/ErrorState';
export type { ErrorStateProps } from './components/ErrorState';

export { Divider } from './components/Divider';
export type {
  DividerInset,
  DividerOrientation,
  DividerProps,
} from './components/Divider';

export { Dialog } from './components/Dialog';
export type { DialogProps } from './components/Dialog';

export { ToastProvider, useToast, useToastStore } from './components/Toast';
export type {
  ToastData,
  ToastInput,
  ToastProviderProps,
  ToastVariant,
} from './components/Toast';

// Бизнес-компоненты (Промт 6, Часть D)
export {
  PriceDisplay,
  formatPrice,
  discountPercent,
  NARROW_NBSP,
} from './components/PriceDisplay';
export type {
  PriceDisplayProps,
  PriceDisplaySize,
} from './components/PriceDisplay';

export { QuantitySelector } from './components/QuantitySelector';
export type { QuantitySelectorProps } from './components/QuantitySelector';

export { StockIndicator } from './components/StockIndicator';
export type {
  StockIndicatorProps,
  StockLevel,
} from './components/StockIndicator';

export {
  OrderStatus,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
} from './components/OrderStatus';
export type {
  OrderStatusProps,
  OrderStatusType,
} from './components/OrderStatus';

export { ProductCard } from './components/ProductCard';
export type { ProductCardProps } from './components/ProductCard';

export { ProductRow } from './components/ProductRow';
export type { ProductRowProps } from './components/ProductRow';

export { OrderSummary } from './components/OrderSummary';
export type {
  OrderSummaryItem,
  OrderSummaryProps,
} from './components/OrderSummary';

export { PartyCard, initialsOf } from './components/PartyCard';
export type { PartyCardProps } from './components/PartyCard';

export { LocationSelector } from './components/LocationSelector';
export type {
  LocationSelectorProps,
  SelectorLocation,
} from './components/LocationSelector';

export { DeliveryCard } from './components/DeliveryCard';
export type {
  DeliveryCardProps,
  DeliveryMethod,
} from './components/DeliveryCard';

// Промт 8: компоненты каталога
export { SearchBar } from './components/SearchBar';
export type { SearchBarProps } from './components/SearchBar';

export { CategoryChip } from './components/CategoryChip';
export type { CategoryChipProps } from './components/CategoryChip';

export { FilterChip } from './components/FilterChip';
export type { FilterChipProps } from './components/FilterChip';

export { PriceRangeInput } from './components/PriceRangeInput';
export type { PriceRangeInputProps } from './components/PriceRangeInput';

export { ProductGallery } from './components/ProductGallery';
export type { ProductGalleryProps } from './components/ProductGallery';

export { SectionHeader } from './components/SectionHeader';
export type { SectionHeaderProps } from './components/SectionHeader';

export { EmptyCatalogState } from './components/EmptyCatalogState';
export type { EmptyCatalogStateProps } from './components/EmptyCatalogState';

export { SortPicker, SORT_OPTIONS } from './components/SortPicker';
export type { SortPickerProps, SortValue } from './components/SortPicker';

export {
  ProductDetailCard,
  stockLevelFor,
  unitShort,
} from './components/ProductDetailCard';
export type {
  ProductDetailCardProps,
  DetailOffer,
} from './components/ProductDetailCard';
