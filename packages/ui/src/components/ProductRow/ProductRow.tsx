/**
 * ProductRow — строка товара (список, сводка заказа).
 *
 * Слева — название и состав количества («2 × 125 ₽»), справа —
 * сумма строки табличными цифрами. Только презентация.
 */
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { formatPrice } from '../PriceDisplay';
import { Text } from '../Text';

export interface ProductRowProps {
  name: string;
  /** Цена за единицу в копейках. */
  priceKopecks: number;
  quantity: number;
  /** Единица измерения: «кг», «шт». */
  unit?: string;
}

export function ProductRow({
  name,
  priceKopecks,
  quantity,
  unit,
}: ProductRowProps) {
  const { colors, spacing } = useTheme();
  const total = priceKopecks * quantity;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        minHeight: 48,
        paddingVertical: spacing.xs,
      }}
      accessibilityLabel={`${name}, ${quantity}${unit ? ` ${unit}` : ''}, ${formatPrice(total)}`}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodySmall" numberOfLines={2}>
          {name}
        </Text>
        <Text variant="caption" color="textSecondary" mono>
          {`${quantity} × ${formatPrice(priceKopecks)}`}
        </Text>
      </View>
      <Text variant="body" mono style={{ color: colors.text }}>
        {formatPrice(total)}
      </Text>
    </View>
  );
}
