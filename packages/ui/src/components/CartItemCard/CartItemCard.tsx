/**
 * CartItemCard — позиция корзины (Промт 9, Часть D).
 *
 * Фото-слот 64×64: фото или силуэт продукции (Промт 16, A),
 * название, продавец, минимальная партия, выбор количества
 * (QuantitySelector), сумма строки (PriceDisplay) и удаление.
 * Только презентация: действия приходят колбэками.
 */
import { Pressable, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTheme } from '../../theme';
import type { SilhouetteKey } from '../../icons/silhouettes';
import { Badge } from '../Badge';
import { formatPrice, PriceDisplay } from '../PriceDisplay';
import { ProductPlaceholder } from '../ProductPlaceholder/ProductPlaceholder';
import { QuantitySelector } from '../QuantitySelector';
import { Text } from '../Text';

export interface CartItemCardProps {
  /** Название товара. */
  name: string;
  /** Единица: «1 кг». */
  unit: string;
  /** Продавец. */
  sellerName: string;
  /** Цена за единицу, копейки: персональная (если quote задан)
   *  или базовая оффера. */
  priceKopecks: number;
  /** Количество. */
  quantity: number;
  /** Минимальная партия продавца. */
  minQuantity: number;
  /** Доступный склад. */
  stock: number;
  /** Персональная цена (Промт 16, C): бейдж «Персональная цена»
   *  + предупреждение об истёкшем сроке. */
  quote?: {
    id: string;
    priceKopecks: number;
    expired: boolean;
    validUntil: string | Date;
  } | null;
  /** Силуэт заглушки без фото (Промт 16, A). */
  silhouette?: SilhouetteKey;
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
  quote = null,
  silhouette = 'crate',
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
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
      }}
      accessibilityLabel={`Позиция корзины: ${name}, ${quantity} × ${formatPrice(priceKopecks)}, сумма ${formatPrice(total)}`}
    >
      {/* Промт 16 (C): позиция по персональной цене — колонка
          с бейджем и предупреждением об истёкшем сроке. */}
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.md,
          padding: spacing.md,
        }}
      >
        {/* Слот фото: настоящее фото или силуэт продукции
          (Промт 16, A) — у покупателя, без камеры-бейджа. */}
        <ProductPlaceholder
          silhouette={silhouette}
          size={64}
          accessibilityLabel={`${name}, фото отсутствует`}
          style={{ borderRadius: radii.md }}
        />

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
                {` · ${unit}`}
              </Text>
              {quote ? (
                <View style={{ flexDirection: 'row', marginTop: 2 }}>
                  <Badge variant="info" size="sm">
                    Персональная цена
                  </Badge>
                </View>
              ) : null}
              {quote?.expired ? (
                <Text
                  variant="caption"
                  color="textSecondary"
                  style={{ marginTop: 2 }}
                  testID="cart-quote-expired"
                >
                  Срок персональной цены истёк — создайте новый запрос
                </Text>
              ) : null}
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
    </View>
  );
}
