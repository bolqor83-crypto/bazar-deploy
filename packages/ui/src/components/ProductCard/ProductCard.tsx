/**
 * ProductCard — карточка товара для витрины (список/сетка).
 *
 * Только презентация: данные приходят пропсами. Заглушка изображения
 * (иконка на пастельном тоне — тон детерминирован индексом) до
 * подключения настоящих фото (Промт 9). Цена — PriceDisplay (копейки,
 * U+202F, табличные цифры), наличие — StockIndicator.
 *
 * Промт 8: добавлены описание, продавец, бейджи «Хит»/«Скоропорт»
 * и ширина под сетку каталога (2 колонки).
 *
 * Промт 12 (доработка по VLM-аудиту): кнопка быстрого добавления
 * в корзину, бейджи поверх фото и цена с юнитом «/ кг» в одной
 * строке — у всех карточек одинаковая структура.
 */
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Plus, ShoppingBasket } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { placeholderTone } from '../../tokens/placeholder';
import { Badge } from '../Badge';
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
  /** Короткое описание: одна строка с многоточием. */
  description?: string;
  /** Продавец лучшего предложения («Опт-Юг»). */
  organizationName?: string;
  /** Хит продаж (badge === 'hit' в API). */
  isHit?: boolean;
  isPerishable?: boolean;
  /** Индекс тона заглушки (0–2, цикл). */
  toneIndex?: number;
  /** Быстрое добавление в корзину (минимальной партией). */
  onAddToCart?: () => void;
  onPress?: () => void;
  testID?: string;
  /** Ширина карточки: по умолчанию 168, сетка каталога передаёт flex:1. */
  style?: StyleProp<ViewStyle>;
}

export function ProductCard({
  name,
  priceKopecks,
  oldPriceKopecks = null,
  stock,
  unit,
  description,
  organizationName,
  isHit = false,
  isPerishable = false,
  toneIndex = 0,
  onAddToCart,
  onPress,
  testID,
  style,
}: ProductCardProps) {
  const { colors, radii, spacing } = useTheme();

  const hasBadges = isHit || isPerishable;

  const body = (
    <View style={{ gap: spacing.sm }}>
      {/* Бейджи — поверх фото в левом верхнем углу: у всех карточек
          одинаковая структура и высота (VLM-аудит: «разнобой —
          бейдж/цена/наличие на разных уровнях»). */}
      <View
        style={{
          height: 96,
          borderRadius: radii.sm,
          backgroundColor: placeholderTone(toneIndex),
        }}
      >
        {hasBadges ? (
          <View
            style={{
              position: 'absolute',
              top: spacing.xs,
              left: spacing.xs,
              flexDirection: 'row',
              gap: spacing.xs,
            }}
          >
            {isHit ? (
              <Badge variant="warning" size="sm">
                Хит
              </Badge>
            ) : null}
            {isPerishable ? (
              <Badge variant="neutral" size="sm">
                Скоропорт
              </Badge>
            ) : null}
          </View>
        ) : null}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShoppingBasket size={32} color={colors.textMuted} />
        </View>
      </View>

      <Text variant="bodyStrong" numberOfLines={2}>
        {name}
      </Text>

      {description ? (
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {description}
        </Text>
      ) : null}

      {/* Цена с юнитом «/ кг» и кнопкой быстрого добавления:
          отдельная строка юнита над ценой дублировала информацию. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.xs,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 3,
            flexShrink: 1,
          }}
        >
          <PriceDisplay value={priceKopecks} oldPrice={oldPriceKopecks} />
          {unit ? (
            <Text
              variant="caption"
              color="textSecondary"
              numberOfLines={1}
              style={{ flexShrink: 0 }}
            >
              {`/ ${unit}`}
            </Text>
          ) : null}
        </View>
        {onAddToCart ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Добавить в корзину: ${name}`}
            onPress={onAddToCart}
            hitSlop={2}
            testID="product-quick-add"
            style={({ pressed }) => [
              {
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              },
              pressed ? { opacity: 0.8 } : null,
            ]}
          >
            <Plus size={22} color={colors.onPrimary} />
          </Pressable>
        ) : null}
      </View>

      {organizationName ? (
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {organizationName}
        </Text>
      ) : null}

      {stock ? <StockIndicator stock={stock} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Card onPress={onPress} style={[{ width: 168 }, style]} testID={testID}>
        {body}
      </Card>
    );
  }

  return (
    <Card style={[{ width: 168 }, style]} testID={testID}>
      {body}
    </Card>
  );
}
