/**
 * TopProductsList — топ товаров по объёму (Промт 18, D):
 * номер места, имя, количество и заказы; крупные tabular-цифры.
 */
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../Text';

export interface TopProductItem {
  productName: string;
  quantity: number;
  unit: string;
  ordersCount: number;
}

/**
 * Единица продукта в seed — «1 кг»: в топе показываем «40 кг».
 */
function formatUnit(unit: string): string {
  return unit.replace(/^1\s+/, '');
}

export interface TopProductsListProps {
  items: TopProductItem[];
  testID?: string;
}

export function TopProductsList({ items, testID }: TopProductsListProps) {
  const { colors, spacing, radii } = useTheme();

  return (
    <View testID={testID} style={{ gap: spacing.sm }}>
      {items.map((item, index) => (
        <View
          key={`${item.productName}-${index}`}
          accessibilityLabel={`Место ${index + 1}: ${item.productName}, ${item.quantity} ${formatUnit(item.unit)}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            backgroundColor: colors.backgroundElevated,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.surfaceMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              variant="bodyStrong"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {index + 1}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {item.productName}
            </Text>
            <Text
              variant="caption"
              color="textMuted"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {`${item.ordersCount} зак.`}
            </Text>
          </View>
          <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>
            {`${item.quantity} ${formatUnit(item.unit)}`.trim()}
          </Text>
        </View>
      ))}
    </View>
  );
}
