/**
 * ProductCard — карточка товара для витрины (список/сетка).
 *
 * Только презентация: данные приходят пропсами. Фото товара —
 * Image с cover-заглушкой (иконка на пастельном тоне) при отсутствии
 * или ошибке загрузки. Цена — PriceDisplay (копейки, U+202F, табличные
 * цифры), наличие — StockIndicator.
 *
 * Промт 8: добавлены описание, продавец, бейджи «Хит»/«Скоропорт»
 * и ширина под сетку каталога (2 колонки).
 *
 * Промт 12 (доработка по VLM-аудиту): кнопка быстрого добавления
 * в корзину, бейджи поверх фото и цена с юнитом «/ кг» в одной
 * строке — у всех карточек одинаковая структура.
 *
 * Промт 12 (итерация 3): реальные фото товаров (imageUrl) вместо
 * постоянной заглушки-корзины (VLM: «черновик, не инструмент»);
 * юнит под ценой («за 500 г») — строка «490 ₽ / 500 г» съедалась
 * кнопкой «+»; мини-степпер «в корзине» вместо «+» (состояние
 * «товар уже в корзине»).
 *
 * Промт 14a: режим compact — компактная карточка для горизонтальной
 * карусели похожих товаров: ширина 160, квадратное фото 1:1, один
 * бейдж, без корзинных действий (карусель — навигация, не покупка).
 */
import { useState } from 'react';
import {
  Image,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Minus, Plus, ShoppingBasket } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { placeholderTone } from '../../tokens/placeholder';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { PriceDisplay } from '../PriceDisplay';
import { StockIndicator, type StockLevel } from '../StockIndicator';
import { Text } from '../Text';

/** Ширина compact-карточки (Промт 14a): карусель похожих. */
export const PRODUCT_CARD_COMPACT_WIDTH = 160;

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
  /** Фото товара (URL или относительный путь API). */
  imageUrl?: string | null;
  /** Быстрое добавление в корзину (минимальной партией). */
  onAddToCart?: () => void;
  /** Товар уже в корзине: партий (мини-степпер вместо «+»). */
  quantityInCart?: number;
  /** Добавить одну партию из карточки. */
  onIncrement?: () => void;
  /** Убрать одну партию; при 1 — убрать позицию. */
  onDecrement?: () => void;
  onPress?: () => void;
  testID?: string;
  /** Компактный режим (Промт 14a): для карусели похожих товаров —
   * ширина 160, квадратное фото, без корзинных действий. */
  compact?: boolean;
  /** Единый бейдж для compact-режима («Хит», «Скоропорт»). */
  badge?: string;
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
  imageUrl,
  onAddToCart,
  quantityInCart = 0,
  onIncrement,
  onDecrement,
  onPress,
  testID,
  compact = false,
  badge,
  style,
}: ProductCardProps) {
  const { colors, radii, spacing } = useTheme();

  // Ошибка загрузки фото → заглушка (тон по индексу).
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  // Compact (Промт 14a): один бейдж из строки; обычный режим —
  // пара isHit/isPerishable.
  const hasBadges = compact ? Boolean(badge) : Boolean(isHit || isPerishable);

  const body = (
    <View style={{ gap: compact ? spacing.xs : spacing.sm }}>
      {/* Бейджи — поверх фото в левом верхнем углу: у всех карточек
          одинаковая структура и высота (VLM-аудит: «разнобой —
          бейдж/цена/наличие на разных уровнях»). */}
      <View
        style={[
          {
            backgroundColor: placeholderTone(toneIndex),
            overflow: 'hidden',
          },
          compact
            ? { aspectRatio: 1, borderRadius: radii.md }
            : { height: 96, borderRadius: radii.sm },
        ]}
      >
        {hasBadges ? (
          <View
            style={{
              position: 'absolute',
              top: spacing.xs,
              left: spacing.xs,
              flexDirection: 'row',
              gap: spacing.xs,
              zIndex: 1,
            }}
          >
            {compact ? (
              <Badge variant="neutral" size="sm">
                {badge}
              </Badge>
            ) : (
              <>
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
              </>
            )}
          </View>
        ) : null}
        {showImage ? (
          <Image
            source={{ uri: imageUrl as string }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            accessibilityLabel={`Фото: ${name}`}
          />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBasket size={compact ? 28 : 32} color={colors.textMuted} />
          </View>
        )}
      </View>

      {compact ? (
        /* Compact (Промт 14a): bodySmall 600, две строки, цена
           сильнее текста; без корзинных действий. */
        <>
          <Text
            variant="bodySmall"
            style={{ fontWeight: '600' }}
            numberOfLines={2}
          >
            {name}
          </Text>
          {description ? (
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {description}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <PriceDisplay value={priceKopecks} oldPrice={null} size="sm" />
            {unit ? (
              <Text
                variant="caption"
                color="textMuted"
                numberOfLines={1}
                style={{ marginLeft: spacing.xs }}
              >
                {`/ ${unit}`}
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Text variant="bodyStrong" numberOfLines={2}>
            {name}
          </Text>

          {description ? (
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {description}
            </Text>
          ) : null}

          {/* Цена и юнит в два этажа: «490 ₽ / 500 г» в одну строку
              съедалась кнопкой «+» (VLM-аудит итерации 3) — юнит теперь
              под ценой («за 500 г»). Справа — «+» или мини-степпер,
              когда товар уже в корзине. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.xs,
            }}
          >
            <View style={{ flexShrink: 1 }}>
              <PriceDisplay value={priceKopecks} oldPrice={oldPriceKopecks} />
              {unit ? (
                <Text
                  variant="micro"
                  color="textMuted"
                  numberOfLines={1}
                  style={{ marginTop: 1 }}
                >
                  {`за ${unit}`}
                </Text>
              ) : null}
            </View>
            {quantityInCart > 0 && onIncrement && onDecrement ? (
              <View
                testID="product-in-cart-stepper"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: 40,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  backgroundColor: colors.primarySoft,
                  overflow: 'hidden',
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Убрать партию: ${name}`}
                  onPress={onDecrement}
                  hitSlop={8}
                  testID="product-decrement"
                  style={({ pressed }) => ({
                    width: 36,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Minus size={16} color={colors.primaryText} />
                </Pressable>
                <Text
                  variant="bodyStrong"
                  mono
                  style={{ minWidth: 22, textAlign: 'center' }}
                >
                  {quantityInCart}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Добавить партию: ${name}`}
                  onPress={onIncrement}
                  hitSlop={8}
                  testID="product-increment"
                  style={({ pressed }) => ({
                    width: 36,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Plus size={16} color={colors.primaryText} />
                </Pressable>
              </View>
            ) : onAddToCart ? (
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
        </>
      )}
    </View>
  );

  const width = compact ? PRODUCT_CARD_COMPACT_WIDTH : 168;
  const cardStyle: StyleProp<ViewStyle> = [
    { width },
    // Compact (Промт 14a): плотнее внутренние отступы.
    ...(compact ? [{ padding: spacing.md }] : []),
    style,
  ];

  if (onPress) {
    return (
      <Card onPress={onPress} style={cardStyle} testID={testID}>
        {body}
      </Card>
    );
  }

  return (
    <Card style={cardStyle} testID={testID}>
      {body}
    </Card>
  );
}
