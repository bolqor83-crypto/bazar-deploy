/**
 * PriceDisplay — цена товара.
 *
 * Деньги хранятся в копейках (integer), отображаются в рублях:
 * разделитель групп — узкий неразрывный пробел U+202F, он же —
 * перед знаком рубля. Цифры табличные (tabular-nums): суммы в
 * столбик не «пляшут».
 *
 * oldPrice — зачёркнутая прежняя цена со скидкой-бейджем «−N%»
 * (вариант warning — янтарь, красный запрещён).
 */
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { Badge } from '../Badge';
import { Text } from '../Text';

/** Узкий неразрывный пробел: не разрывает сумму при переносе строк. */
export const NARROW_NBSP = '\u202F';

/**
 * Копейки → строка в рублях: «12\u202F500 ₽», «12\u202F500,50 ₽».
 * Экспортируется для переиспользования (OrderSummary, DeliveryCard).
 */
export function formatPrice(kopecks: number): string {
  const rubles = kopecks / 100;
  const hasKopecks = Math.round(kopecks) % 100 !== 0;
  const formatted = rubles.toLocaleString('ru-RU', {
    minimumFractionDigits: hasKopecks ? 2 : 0,
    maximumFractionDigits: 2,
  });
  // В ru-RU ICU группы разделяет обычный неразрывный пробел —
  // приводим к узкому (U+202F).
  return `${formatted.replace(/\u00A0/g, NARROW_NBSP)}${NARROW_NBSP}₽`;
}

/** Скидка в процентах между старой и текущей ценой. */
export function discountPercent(
  priceKopecks: number,
  oldPriceKopecks: number,
): number {
  if (oldPriceKopecks <= 0 || priceKopecks >= oldPriceKopecks) {
    return 0;
  }
  return Math.round((1 - priceKopecks / oldPriceKopecks) * 100);
}

export type PriceDisplaySize = 'md' | 'lg';

export interface PriceDisplayProps {
  /** Цена в копейках. */
  value: number;
  /** Прежняя цена в копейках: зачёркивается, добавляет бейдж «−N%». */
  oldPrice?: number | null;
  size?: PriceDisplaySize;
}

export function PriceDisplay({
  value,
  oldPrice = null,
  size = 'md',
}: PriceDisplayProps) {
  const { colors } = useTheme();
  const discount = oldPrice !== null ? discountPercent(value, oldPrice) : 0;

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      accessibilityLabel={`Цена: ${formatPrice(value)}${
        oldPrice !== null ? `, прежняя ${formatPrice(oldPrice)}` : ''
      }`}
    >
      <Text
        variant={size === 'lg' ? 'h3' : 'body'}
        mono
        style={{ color: colors.text }}
      >
        {formatPrice(value)}
      </Text>
      {oldPrice !== null ? (
        <>
          <Text
            variant="bodySmall"
            mono
            style={{
              color: colors.textMuted,
              textDecorationLine: 'line-through',
            }}
          >
            {formatPrice(oldPrice)}
          </Text>
          {discount > 0 ? (
            <Badge variant="warning" size="sm">{`−${discount}%`}</Badge>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
