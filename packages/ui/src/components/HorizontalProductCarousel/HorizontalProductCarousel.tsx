/**
 * HorizontalProductCarousel — горизонтальная карусель товаров
 * (Промт 14a): «Похожие товары» на карточке товара.
 *
 * Не свалка карточек: горизонтальный snap-скролл, каждая карточка —
 * самостоятельный объект (ProductCard compact: 160 ширина, квадратное
 * фото 1:1). Заголовок h2 слева, ghost-ссылка «Все →» справа.
 *
 * Состояния: loading — 3 skeleton-карточки; empty — секция скрыта
 * целиком (заголовок тоже); error — не обрабатывается компонентом,
 * решение за родителем (например, не рендерить).
 *
 * Жесты: карусель живёт в вертикальном ScrollView страницы —
 * горизонтальный скролл не конфликтует с вертикальным; галерея
 * товара выше — отдельный компонент со своими жестами.
 *
 * Snap: native — snapToInterval (ширина + gap), web — snapToOffsets
 * по индексам (react-native-web не поддерживает snapToInterval).
 * Хаптика selection на остановке прокрутки (троттл внутри haptics).
 */
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { hapticSelection } from '../../tokens/haptics';
import type { SilhouetteKey } from '../../icons/silhouettes';
import {
  ProductCard,
  PRODUCT_CARD_COMPACT_WIDTH,
} from '../ProductCard/ProductCard';
import { Skeleton } from '../Skeleton';
import { Text } from '../Text';

/** Один элемент карусели (презентационная модель). */
export interface CarouselItem {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  /** Силуэт заглушки без фото (Промт 16, A). */
  silhouette?: SilhouetteKey;
  /** Цена в копейках. */
  price: number;
  unit: string;
  badge?: string;
}

export interface HorizontalProductCarouselProps {
  title: string;
  items: CarouselItem[];
  onItemPress?: (id: string) => void;
  /** Показывает ссылку «Все →» справа от заголовка. */
  onSeeAllPress?: () => void;
  loading?: boolean;
  emptyText?: string;
  testID?: string;
}

export function HorizontalProductCarousel({
  title,
  items,
  onItemPress,
  onSeeAllPress,
  loading = false,
  emptyText = 'Похожих товаров пока нет',
  testID,
}: HorizontalProductCarouselProps) {
  const { spacing, colors } = useTheme();

  // Empty: секция (включая заголовок) не показывается вовсе —
  // пустой блок между карточкой товара и CTA только шумит.
  if (!loading && items.length === 0) {
    return null;
  }

  const gap = spacing.md;
  const cardWidth = PRODUCT_CARD_COMPACT_WIDTH;
  const step = cardWidth + gap;

  return (
    <View testID={testID} accessibilityLabel={title}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
          paddingHorizontal: spacing.lg,
        }}
      >
        <Text variant="h2">{title}</Text>
        {onSeeAllPress ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${title}: все товары`}
            hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }}
            onPress={() => {
              hapticSelection();
              onSeeAllPress();
            }}
            testID="carousel-see-all"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 48,
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text variant="bodySmall" color="primaryText">
              Все
            </Text>
            <ChevronRight size={18} color={colors.primaryText} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        accessibilityLabel={`Карусель: ${title}`}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          gap,
          alignItems: 'flex-start',
        }}
        /* Native: один шаг = ширина карточки + gap. Web:
           snapToOffsets по индексам (тот же шаг). */
        {...(Platform.OS === 'web'
          ? {
              snapToOffsets: Array.from(
                { length: items.length },
                (_, index) => index * step,
              ),
            }
          : { snapToInterval: step })}
        onMomentumScrollEnd={() => {
          // Хаптика на остановке прокрутки — «щелчок» перелистывания.
          hapticSelection();
        }}
        testID="carousel-scroll"
      >
        {loading
          ? [0, 1, 2].map((index) => (
              <View
                key={`skeleton-${index}`}
                testID="carousel-skeleton"
                style={{ width: cardWidth, height: 244 }}
              >
                <Skeleton width={cardWidth} height={cardWidth} radius={16} />
                <Skeleton
                  height={18}
                  width="90%"
                  style={{ marginTop: spacing.md }}
                />
                <Skeleton
                  height={18}
                  width="55%"
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            ))
          : items.map((item, index) => (
              <ProductCard
                key={item.id}
                compact
                name={item.title}
                description={item.subtitle}
                imageUrl={item.image ?? null}
                silhouette={item.silhouette}
                priceKopecks={item.price}
                unit={item.unit}
                badge={item.badge}
                toneIndex={index % 3}
                onPress={onItemPress ? () => onItemPress(item.id) : undefined}
                testID={`carousel-item-${item.id}`}
              />
            ))}
      </ScrollView>

      {/* Empty-текст: сюда доходит только при loading=true и пустых
          items (иначе ранний return выше) — страховка от «пустой
          дыры», если родитель передал items позже. */}
      {!loading && items.length === 0 ? <Text>{emptyText}</Text> : null}
    </View>
  );
}
