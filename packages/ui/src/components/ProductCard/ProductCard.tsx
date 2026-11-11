/**
 * ProductCard — карточка товара для витрины (список/сетка).
 *
 * Только презентация: данные приходят пропсами. Заглушка изображения
 * (иконка на приглушённом фоне) — настоящие фото появятся с API.
 * Цена — PriceDisplay (копейки, U+202F, табличные цифры), наличие —
 * StockIndicator.
 */
import { View } from 'react-native';
import { ShoppingBasket } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Card } from '../Card';
import { PriceDisplay } from '../PriceDisplay';
import { StockIndicator, type StockLevel } from '../StockIndicator';
import { Text } from '../Text';

export interface ProductCardProps {
  name: string;
  /** Цена в копейках. */
  priceKopecks: number;
  /** Прежняя цена в копейках (скидка). */
  oldPriceKopecks?: number | null;
  /** Наличие; не показывается, если не задано. */
  stock?: StockLevel;
  /** Единица измерения: «кг», «шт», «упак». */
  unit?: string;
  onPress?: () => void;
}

export function ProductCard({
  name,
  priceKopecks,
  oldPriceKopecks = null,
  stock,
  unit,
  onPress,
}: ProductCardProps) {
  const { colors, radii, spacing } = useTheme();

  const body = (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          height: 96,
          borderRadius: radii.sm,
          backgroundColor: colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ShoppingBasket size={32} color={colors.textMuted} />
      </View>
      <Text variant="bodySmall" numberOfLines={2}>
        {name}
      </Text>
      {unit ? (
        <Text variant="caption" color="textMuted">
          {unit}
        </Text>
      ) : null}
      <PriceDisplay value={priceKopecks} oldPrice={oldPriceKopecks} />
      {stock ? <StockIndicator stock={stock} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Card onPress={onPress} style={{ width: 168 }}>
        {body}
      </Card>
    );
  }

  return <Card style={{ width: 168 }}>{body}</Card>;
}
