/**
 * ProductCard — карточка товара для витрины (список/сетка).
 *
 * Только презентация: данные приходят пропсами. Фото товара —
 * Image с cover-заглушкой (иконка на пастельном тоне) при отсутствии
 * или ошибке загрузки. Цена — PriceDisplay (копейки, U+202F, табличные
 * цифры), наличие — StockDot.
 *
 * Промт 12: бейджи «Хит»/«Скоропорт», кнопка быстрого добавления,
 * мини-степпер «в корзине».
 *
 * Промт 14b: фото 1:1, радиус md, Card default (shadow sm).
 *
 * Промт 15 (Часть C): компактная карточка каталога —
 * - фото на всю ширину карточки (bleed, без боковых полей);
 * - цена — одна строка bodyStrong + юнит (перенос на 360px);
 * - степпер/«+» — плавающий, absolute bottom/right ПОВЕРХ ФОТО
 *   (паттерн доставки еды): не занимает высоту карточки;
 * - описание и продавец из карточки убраны: в сетке каталога
 *   решают фото, название и цена (пропцы оставлены для
 *   совместимости вызовов, игнорируются — решение в отчёте 15).
 *
 * Промт 16 (Часть B): заголовок — bodySmall 15/600 с
 * фиксированной высотой 44 (2×22): длинные названия
 * («Картофель продовольственный») помещаются аккуратнее,
 * сетка не «прыгает». Отклонение от «body >=17 для чтения» —
 * осознанное: это сканируемая сетка, доминирует фото;
 * на детальной странице полный размер сохранён (ADR 0016).
 *
 * Высота на 390 (колонка 173): фото 173 (bleed от верхнего края)
 * + 12 + 44 (заголовок) + 4 + 24 (цена) + 16 = 270±5 —
 * 2×2 видно без скролла.
 */
import { useState } from 'react';
import {
  Image,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { placeholderTone } from '../../tokens/placeholder';
import type { SilhouetteKey } from '../../icons/silhouettes';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { PriceDisplay } from '../PriceDisplay';
import { ProductPlaceholder } from '../ProductPlaceholder/ProductPlaceholder';
import { StockDot } from '../StockDot';
import { Text } from '../Text';
import type { StockLevel } from '../StockIndicator';

/** Ширина compact-карточки (Промт 14a): карусель похожих. */
export const PRODUCT_CARD_COMPACT_WIDTH = 160;

/** Фиксированная высота заголовка: 2 строки bodySmall (15/22). */
export const PRODUCT_CARD_TITLE_HEIGHT = 44;

/** Типографика заголовка карточки каталога (Промт 16, B). */
export const PRODUCT_CARD_TITLE_VARIANT = 'bodySmall' as const;
export const PRODUCT_CARD_TITLE_WEIGHT = '600' as const;

export interface ProductCardProps {
  name: string;
  /** Цена в копейках; null — «цена по запросу» (Промт 16, C):
   *  вместо цены — подпись, корзинные действия скрыты
   *  (без персонального предложения добавить нельзя). */
  priceKopecks: number | null;
  /** Явный признак «цена по запросу» (priceKopecks === null). */
  priceOnRequest?: boolean;
  /** Прежняя цена в копейках (скидка). */
  oldPriceKopecks?: number | null;
  /** Наличие; не показывается, если не задано. */
  stock?: StockLevel;
  /** Единица измерения: «кг», «шт», «упак». */
  unit?: string;
  /** Короткое описание — НЕ рендерится с Промта 15 (Часть C). */
  description?: string;
  /** Продавец — НЕ рендерится с Промта 15 (Часть C). */
  organizationName?: string;
  /** Хит продаж (badge === 'hit' в API). */
  isHit?: boolean;
  isPerishable?: boolean;
  /** Индекс тона заглушки (0–2, цикл). */
  toneIndex?: number;
  /** Фото товара (URL или относительный путь API). */
  imageUrl?: string | null;
  /** Силуэт заглушки без фото (Промт 16, A): ключ решает
   *  бизнес-слой (resolveSilhouette), UI не мапит. */
  silhouette?: SilhouetteKey;
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
   *  ширина 160, квадратное фото, без корзинных действий. */
  compact?: boolean;
  /** Единый бейдж для compact-режима («Хит», «Скоропорт»). */
  badge?: string;
  /** Ширина карточки: по умолчанию 168, сетка каталога передаёт flex:1. */
  style?: StyleProp<ViewStyle>;
}

export function ProductCard({
  name,
  priceKopecks,
  priceOnRequest = false,
  oldPriceKopecks = null,
  stock,
  unit,
  // Description остаётся для compact-режима (карусель 14a);
  // из карточки каталога убран (Промт 15, C).
  description,
  isHit = false,
  isPerishable = false,
  toneIndex = 0,
  imageUrl,
  silhouette = 'crate',
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

  // Промт 16 (C): «цена по запросу» — цены нет, корзинных
  // действий нет (нужно персональное предложение — детальный
  // экран ведёт на запрос цены).
  const isPor = priceOnRequest || priceKopecks === null;

  // Ошибка загрузки фото → заглушка (тон по индексу).
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  // Compact (Промт 14a): один бейдж из строки; обычный режим —
  // пара isHit/isPerishable.
  const hasBadges = compact ? Boolean(badge) : Boolean(isHit || isPerishable);

  // Корзинное действие карточки: мини-степпер (уже в корзине)
  // или «+» (быстрое добавление). В compact-режиме их нет.
  // POR-товар — без корзинных действий (Промт 16, C).
  const showStepper =
    !compact &&
    !isPor &&
    quantityInCart > 0 &&
    onIncrement !== undefined &&
    onDecrement !== undefined;
  const showQuickAdd =
    !compact && !isPor && !showStepper && onAddToCart !== undefined;

  /** Плавающий корпус действия — absolute поверх фото. */
  const floatingAction =
    showStepper || showQuickAdd ? (
      <View
        style={{
          position: 'absolute',
          bottom: spacing.sm + 4,
          right: spacing.sm + 4,
          zIndex: 2,
        }}
      >
        {showStepper ? (
          <View
            testID="product-in-cart-stepper"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              height: 36,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              backgroundColor: colors.surface,
              overflow: 'hidden',
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Убрать партию: ${name}`}
              onPress={onDecrement}
              hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}
              testID="product-decrement"
              style={({ pressed }) => ({
                width: 30,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Minus size={15} color={colors.primaryText} />
            </Pressable>
            <Text
              variant="bodySmall"
              mono
              style={{ minWidth: 20, textAlign: 'center' }}
            >
              {quantityInCart}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Добавить партию: ${name}`}
              onPress={onIncrement}
              hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}
              testID="product-increment"
              style={({ pressed }) => ({
                width: 30,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Plus size={15} color={colors.primaryText} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Добавить в корзину: ${name}`}
            onPress={onAddToCart}
            hitSlop={4}
            testID="product-quick-add"
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              },
              pressed ? { opacity: 0.8 } : null,
            ]}
          >
            <Plus size={21} color={colors.onPrimary} />
          </Pressable>
        )}
      </View>
    ) : null;

  const body = compact ? (
    <View style={{ gap: spacing.xs }}>
      {/* Compact (Промт 14a): квадратное фото с бейджем,
         StockDot — для консистентности с каталогом (Промт 15). */}
      <View
        style={{
          backgroundColor: placeholderTone(toneIndex),
          overflow: 'hidden',
          aspectRatio: 1,
          borderRadius: radii.md,
        }}
      >
        {stock ? (
          <View
            testID="product-stock-dot"
            style={{
              position: 'absolute',
              top: spacing.sm,
              left: spacing.sm,
              zIndex: 1,
            }}
          >
            <StockDot level={stock} />
          </View>
        ) : null}
        {hasBadges ? (
          <View
            style={{
              position: 'absolute',
              top: spacing.sm,
              right: spacing.sm,
              zIndex: 1,
            }}
          >
            <Badge variant="neutral" size="sm">
              {badge}
            </Badge>
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
          <ProductPlaceholder
            silhouette={silhouette}
            size="fill"
            accessibilityLabel={`${name}, фото отсутствует`}
          />
        )}
      </View>

      <Text variant="bodySmall" style={{ fontWeight: '600' }} numberOfLines={2}>
        {name}
      </Text>
      {description ? (
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {description}
        </Text>
      ) : null}
      {isPor ? (
        <Text
          variant="bodySmall"
          color="primaryText"
          style={{ fontWeight: '600' }}
          numberOfLines={1}
          testID="product-price-on-request"
        >
          Цена по запросу
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <PriceDisplay value={priceKopecks ?? 0} oldPrice={null} size="sm" />
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
      )}
    </View>
  ) : (
    <View>
      {/* Фото — bleed на всю ширину карточки от верхнего края:
          верхние углы повторяют радиус карточки, нижние прямые.
          Точка наличия — слева сверху, бейджи — справа сверху,
          степпер/«+» — плавающий справа внизу (Промт 15, B+C). */}
      <View
        style={{
          backgroundColor: placeholderTone(toneIndex),
          overflow: 'hidden',
          aspectRatio: 1,
          borderTopLeftRadius: radii.md,
          borderTopRightRadius: radii.md,
        }}
      >
        {stock ? (
          <View
            testID="product-stock-dot"
            style={{
              position: 'absolute',
              top: spacing.sm,
              left: spacing.sm,
              zIndex: 1,
            }}
          >
            <StockDot level={stock} />
          </View>
        ) : null}
        {hasBadges ? (
          <View
            style={{
              position: 'absolute',
              top: spacing.sm,
              right: spacing.sm,
              flexDirection: 'row',
              gap: spacing.xs,
              zIndex: 1,
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
        {showImage ? (
          <Image
            source={{ uri: imageUrl as string }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            accessibilityLabel={`Фото: ${name}`}
          />
        ) : (
          <ProductPlaceholder
            silhouette={silhouette}
            size="fill"
            accessibilityLabel={`${name}, фото отсутствует`}
          />
        )}
        {floatingAction}
      </View>

      {/* Текстовый блок: боковые поля только здесь. */}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingTop: 6,
          paddingBottom: spacing.md,
          gap: 6,
        }}
      >
        {/* Заголовок: bodySmall 15/600 (Промт 16, B) — строго
            2 строки с фиксированной высотой: сетка не «прыгает»
            от длины названия. Прижат к низу блока: у коротких
            названий нет «пустоты» перед ценой. */}
        <View
          style={{
            height: PRODUCT_CARD_TITLE_HEIGHT,
            justifyContent: 'flex-end',
          }}
        >
          <Text
            variant={PRODUCT_CARD_TITLE_VARIANT}
            style={{ fontWeight: PRODUCT_CARD_TITLE_WEIGHT }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {name}
          </Text>
        </View>

        {/* Цена и юнит в одну строку (Промт 15): кнопка «+»
            переехала на фото, строка свободна. На узких экранах
            (360) юнит переносится на вторую строку.
            Промт 16 (C): POR — подпись вместо цены. */}
        {isPor ? (
          <Text
            variant="bodySmall"
            color="primaryText"
            style={{ fontWeight: '600' }}
            numberOfLines={1}
            testID="product-price-on-request"
          >
            Цена по запросу
          </Text>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              columnGap: spacing.xs,
            }}
          >
            <PriceDisplay
              value={priceKopecks ?? 0}
              oldPrice={oldPriceKopecks}
              size="sm"
            />
            {unit ? (
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {`за ${unit}`}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );

  const width = compact ? PRODUCT_CARD_COMPACT_WIDTH : 168;
  const cardStyle: StyleProp<ViewStyle> = [
    { width },
    // Compact (Промт 14a): плотные отступы (решение 14b).
    // Обычный режим (Промт 15, C): паддинг Card обнулён — фото
    // bleed от верхнего края, боковые поля задаёт текстовый блок.
    ...(compact ? [{ padding: spacing.md }] : [{ padding: 0 }]),
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
