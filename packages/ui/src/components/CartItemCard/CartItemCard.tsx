/**
 * CartItemCard — позиция корзины (Промт 9, Часть D).
 *
 * Фото-заглушка 64×64 (пастельный тон), название, продавец,
 * минимальная партия, выбор количества (QuantitySelector),
 * сумма строки (PriceDisplay) и удаление. Только презентация:
 * действия приходят колбэками.
 */
import { Pressable, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { placeholderTone } from '../../tokens/placeholder';
import { formatPrice, PriceDisplay } from '../PriceDisplay';
import { QuantitySelector } from '../QuantitySelector';
import { Text } from '../Text';

export interface CartItemCardProps {
  /** Название товара. */
  name: string;
  /** Единица: «1 кг». */
  unit: string;
  /** Продавец. */
  sellerName: string;
  /** Цена за единицу, копейки. */
  priceKopecks: number;
  /** Количество. */
  quantity: number;
  /** Минимальная партия продавца. */
  minQuantity: number;
  /** Доступный склад. */
  stock: number;
  /** Тон заглушки фото (индекс). */
  toneIndex?: number;
  /** Изменение количества. */
  onQuantityChange: (quantity: number) => void;
  /** Удаление позиции. */
  onRemove: () => void;
  /** Контейнер с тест-хуком. */
  testID?: string;
}

export function CartItemCard({
  name,
  unit,
  sellerName,
  priceKopecks,
  quantity,
  minQuantity,
  stock,
  toneIndex = 0,
  onQuantityChange,
  onRemove,
  testID,
}: CartItemCardProps) {
  const { colors, spacing, radii } = useTheme();
  const total = priceKopecks * quantity;

  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
      }}
      accessibilityLabel={`Позиция корзины: ${name}, ${quantity} × ${formatPrice(priceKopecks)}, сумма ${formatPrice(total)}`}
    >
      {/* Заглушка фото — пастельный тон до настоящих фото (Промт 10). */}
      <View
        accessibilityLabel={`Фото: ${name}`}
        style={{
          width: 64,
          height: 64,
          borderRadius: radii.md,
          backgroundColor: placeholderTone(toneIndex),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="caption" color="textSecondary" style={{ opacity: 0.7 }}>
          {unit}
        </Text>
      </View>

      <View style={{ flex: 1, gap: spacing.xs }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {name}
            </Text>
            <Text variant="caption" color="textSecondary">
              {sellerName}
              {minQuantity > 1 ? ` · партия от ${minQuantity}` : ''}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Удалить ${name}`}
            onPress={onRemove}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Trash2 size={20} color={colors.danger} />
          </Pressable>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          <QuantitySelector
            value={quantity}
            min={minQuantity}
            max={Math.max(minQuantity, stock)}
            onChange={onQuantityChange}
          />
          <PriceDisplay value={total} size="md" />
        </View>
      </View>
    </View>
  );
}
