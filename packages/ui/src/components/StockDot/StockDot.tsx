/**
 * StockDot — точка наличия товара (Промт 15, Часть B).
 *
 * Компактный индикатор для карточки каталога: точка 12×12
 * в левом верхнем углу фото. Уровни: in — success (зелёная),
 * low — accent (янтарная), out — textMuted (серая).
 *
 * Обводка 2px: белая в light-теме, surface в dark — точка
 * не сливается с фото товара. Полный текст наличия остаётся
 * в <StockIndicator> на детальной странице товара.
 */
import { View } from 'react-native';
import { useTheme } from '../../theme';
import type { StockLevel } from '../StockIndicator';

export interface StockDotProps {
  level: StockLevel;
  /** Диаметр точки (по умолчанию 12). */
  size?: number;
}

const STOCK_LABELS: Record<StockLevel, string> = {
  in: 'В наличии',
  low: 'Мало осталось',
  out: 'Нет в наличии',
};

export function StockDot({ level, size = 12 }: StockDotProps) {
  const { colors, isDark } = useTheme();

  const backgroundColor =
    level === 'in'
      ? colors.success
      : level === 'low'
        ? colors.accent
        : colors.textMuted;

  // Обводка отделяет точку от фото: в dark-теме чисто белый
  // круг выглядел бы чужеродным пятном — берём surface.
  const borderColor = isDark ? colors.surface : '#FFFFFF';

  return (
    <View
      accessible
      accessibilityLabel={`Наличие: ${STOCK_LABELS[level]}`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
        borderWidth: 2,
        borderColor,
      }}
    />
  );
}
