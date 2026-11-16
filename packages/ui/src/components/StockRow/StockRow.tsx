/**
 * StockRow — строка остатка в списке «Склад» (Промт 11b).
 *
 * Рабочая плотность 64–72 px: фото 48×48, товар и подпись слева;
 * справа — остаток крупно (tabular-nums, bodyStrong) и раскладка
 * «Резерв · Доступно» мелко. Уровень наличия — точка-индикатор
 * у названия. Только презентация; данные соединяет useStockOverview.
 */
import { Image, Pressable, View } from 'react-native';
import { Package } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Text } from '../Text';
import { formatPrice } from '../PriceDisplay';

/** Уровень остатка: нет / мало / в наличии. */
export type StockLevel = 'in' | 'low' | 'out';

/** Порог «мало»: доступно меньше двух минимальных партий. */
export function stockLevelOf(
  availableQty: number,
  minQuantity: number,
): StockLevel {
  if (availableQty <= 0) {
    return 'out';
  }
  return availableQty < Math.max(1, minQuantity) * 2 ? 'low' : 'in';
}

export interface StockRowProps {
  /** Название товара. */
  title: string;
  /** Единица измерения: «кг», «шт». */
  unit?: string;
  /** Цена за единицу в копейках (подпись слева). */
  priceKopecks?: number;
  /** Минимальная партия — порог «мало осталось». */
  minQuantity?: number;
  /** Всего на складах (физический остаток). */
  physicalQty: number;
  /** Зарезервировано заказами. */
  reservedQty: number;
  /** Доступно к продаже. */
  availableQty: number;
  /** Первое фото (URL) или null — плейсхолдер. */
  imageUrl?: string | null;
  onPress?: () => void;
  testID?: string;
}

const LEVEL_LABELS: Record<StockLevel, string> = {
  in: 'В наличии',
  low: 'Заканчивается',
  out: 'Нет в наличии',
};

export function StockRow({
  title,
  unit,
  priceKopecks,
  minQuantity = 1,
  physicalQty,
  reservedQty,
  availableQty,
  imageUrl,
  onPress,
  testID,
}: StockRowProps) {
  const { colors, spacing, radii } = useTheme();

  const level = stockLevelOf(availableQty, minQuantity);
  const dotColor =
    level === 'in'
      ? colors.success
      : level === 'low'
        ? colors.accent
        : colors.danger;

  const unitSuffix = unit ? ` ${unit}` : '';
  const breakdown =
    reservedQty > 0
      ? `Резерв: ${reservedQty} · Доступно: ${availableQty}`
      : `Доступно: ${availableQty}`;
  const subtitle = priceKopecks
    ? `${formatPrice(priceKopecks)}${unit ? `/${unit}` : ''}`
    : null;

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 68,
        paddingVertical: spacing.sm,
      }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.sm,
            backgroundColor: colors.surface,
          }}
          accessibilityLabel={`Фото: ${title}`}
        />
      ) : (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radii.sm,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="Фото не загружено"
        >
          <Package size={22} color={colors.textMuted} />
        </View>
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: dotColor,
            }}
            accessibilityLabel={LEVEL_LABELS[level]}
          />
          <Text variant="bodySmall" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {breakdown}
        </Text>
      </View>
      <Text variant="bodyStrong" mono style={{ color: colors.text }}>
        {`${physicalQty}${unitSuffix}`}
      </Text>
    </View>
  );

  if (!onPress) {
    return (
      <View
        testID={testID}
        accessibilityLabel={`${title}, остаток ${physicalQty}${unitSuffix}, ${breakdown}`}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, остаток ${physicalQty}${unitSuffix}, ${breakdown}`}
      hitSlop={4}
    >
      {body}
    </Pressable>
  );
}
