/**
 * OrderSummary — сводка заказа.
 *
 * Список позиций (ProductRow) и итог: сумма по позициям или явно
 * переданное значение (например, с учётом доставки). Только
 * презентация: состав приходит пропсами.
 */
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { Divider } from '../Divider';
import { formatPrice } from '../PriceDisplay';
import { ProductRow } from '../ProductRow';
import { Text } from '../Text';

export interface OrderSummaryItem {
  name: string;
  /** Цена за единицу в копейках. */
  priceKopecks: number;
  quantity: number;
  unit?: string;
}

export interface OrderSummaryProps {
  items: OrderSummaryItem[];
  /**
   * Итог в копейках. Если не задан — сумма по позициям
   * (цена × количество).
   */
  totalKopecks?: number;
}

export function OrderSummary({ items, totalKopecks }: OrderSummaryProps) {
  const { spacing } = useTheme();
  const calculated = items.reduce(
    (sum, item) => sum + item.priceKopecks * item.quantity,
    0,
  );
  const total = totalKopecks ?? calculated;

  return (
    <View style={{ gap: spacing.xs }}>
      {items.map((item) => (
        <ProductRow
          key={item.name}
          name={item.name}
          priceKopecks={item.priceKopecks}
          quantity={item.quantity}
          unit={item.unit}
        />
      ))}
      <Divider inset="none" style={{ marginVertical: spacing.sm }} />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: 48,
        }}
      >
        <Text variant="body">Итого</Text>
        <Text
          variant="h3"
          mono
          accessibilityLabel={`Итого: ${formatPrice(total)}`}
        >
          {formatPrice(total)}
        </Text>
      </View>
    </View>
  );
}
