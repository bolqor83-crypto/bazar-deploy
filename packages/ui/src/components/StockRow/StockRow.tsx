/**
 * StockRow — компактная строка остатка в списке «Склад»
 * (Промт 11b; редизайн Промта 12, Часть A).
 *
 * Рабочая строка 64 px без карточной обёртки: фото 40×40 (круглое),
 * товар bodyStrong и цена caption слева; справа — остаток крупно
 * (numberL, tabular-nums) с точкой-индикатором уровня и раскладкой
 * «Резерв · Доступно» micro снизу. Разделитель — Divider снаружи
 * (список), не рамка и не тень. Только презентация; данные
 * соединяет useStockOverview.
 */
import { Image, Pressable, View } from 'react-native';
import { Package } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Text } from '../Text';
import { formatPrice } from '../PriceDisplay';

/** Количество с юнитом оффера: «1 кг» → «75 кг», «100 г» → «166 × 100 г». */
export function formatQuantity(qty: number, unit?: string): string {
  if (!unit) {
    return String(qty);
  }
  const match = unit.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (!match || match[1] === undefined || match[2] === undefined) {
    return `${qty} ${unit}`;
  }
  const multiplier = Number(match[1].replace(',', '.'));
  if (multiplier === 1) {
    return `${qty} ${match[2]}`;
  }
  return `${qty} × ${unit}`;
}

/** Уровень остатка: нет / мало / в наличии. */
export type StockLevel = 'in' | 'low' | 'out';

/** Порог «мало»: доступно меньше двух минимальных партий. */
export function stockLevelOf(
  availableQty: number,
  minQuantity: number,
): StockLevel {
  if (availableQty <= 0) {
    return 'out';
  }
  return availableQty < Math.max(1, minQuantity) * 2 ? 'low' : 'in';
}

export interface StockRowProps {
  /** Название товара. */
  title: string;
  /** Единица измерения: «кг», «шт». */
  unit?: string;
  /** Цена за единицу в копейках (подпись слева). */
  priceKopecks?: number;
  /** Минимальная партия — порог «мало осталось». */
  minQuantity?: number;
  /** Всего на складах (физический остаток). */
  physicalQty: number;
  /** Зарезервировано заказами. */
  reservedQty: number;
  /** Доступно к продаже. */
  availableQty: number;
  /** Первое фото (URL) или null — плейсхолдер. */
  imageUrl?: string | null;
  onPress?: () => void;
  testID?: string;
}

const LEVEL_LABELS: Record<StockLevel, string> = {
  in: 'В наличии',
  low: 'Заканчивается',
  out: 'Нет в наличии',
};

export function StockRow({
  title,
  unit,
  priceKopecks,
  minQuantity = 1,
  physicalQty,
  reservedQty,
  availableQty,
  imageUrl,
  onPress,
  testID,
}: StockRowProps) {
  const { colors } = useTheme();

  const level = stockLevelOf(availableQty, minQuantity);
  const dotColor =
    level === 'in'
      ? colors.success
      : level === 'low'
        ? colors.accentText
        : colors.danger;

  // Фасовка-мультипакет («100 г») уходит под числом отдельной строкой:
  // широкая «166 × 100 г» в numberL прижимала название к краю (VLM-ревью).
  const packMatch = unit?.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  const packUnit =
    packMatch &&
    packMatch[1] !== undefined &&
    Number(packMatch[1].replace(',', '.')) !== 1
      ? `× ${unit}`
      : null;
  // Простой юнит — отдельным мелким текстом рядом с числом (слитное
  // «120 кг» в одном кегле numberL читалось как одно слово, VLM-аудит).
  // Юнит «1 кг» сворачивается до «кг» — множитель 1 не показываем.
  const plainUnit = packMatch?.[2] ?? unit ?? null;
  const inlineUnit = packUnit ? null : plainUnit;
  const quantityText = `${physicalQty}${inlineUnit ? ` ${inlineUnit}` : ''}`;
  // Без резерва доступно = физическому остатку: дубль числа не нужен
  // (решение по VLM-ревью Промта 12, Часть A).
  const breakdown =
    reservedQty > 0
      ? `Резерв: ${reservedQty} · Доступно: ${availableQty}`
      : null;
  const subtitle = priceKopecks
    ? `${formatPrice(priceKopecks)}${plainUnit ? `/${plainUnit}` : ''}`
    : null;

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 64,
        paddingVertical: 6,
      }}
    >
      {/* Плейсхолдер всегда под фото: пастерный фон + иконка;
          загрузившееся фото закрывает его собой. */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel={imageUrl ? `Фото: ${title}` : 'Фото не загружено'}
      >
        <Package size={18} color={colors.textMuted} />
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 40,
              height: 40,
              borderRadius: 20,
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: dotColor,
            }}
            accessibilityLabel={LEVEL_LABELS[level]}
          />
          <Text variant="numberL" style={{ color: colors.text }}>
            {physicalQty}
          </Text>
          {inlineUnit ? (
            <Text variant="bodySmall" color="textSecondary">
              {inlineUnit}
            </Text>
          ) : null}
        </View>
        {/* Фасовка и раскладка резерва — caption: micro 12 в этом месте
            читался как «слишком мелкий» на слабом свету (VLM-аудит). */}
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {[packUnit, breakdown].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </View>
  );

  if (!onPress) {
    return (
      <View
        testID={testID}
        accessibilityLabel={`${title}, остаток ${quantityText}${packUnit ? ` ${packUnit}` : ''}${breakdown ? `, ${breakdown}` : ''}`}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, остаток ${quantityText}${packUnit ? ` ${packUnit}` : ''}${breakdown ? `, ${breakdown}` : ''}`}
      hitSlop={2}
      style={({ pressed }) => [
        { backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      {body}
    </Pressable>
  );
}
