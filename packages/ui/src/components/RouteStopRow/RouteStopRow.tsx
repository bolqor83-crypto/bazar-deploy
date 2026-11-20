/**
 * RouteStopRow — строка остановки маршрута (Промт 17, Часть B).
 *
 * Плотная строка 72: слева бейдж-номер 28 (primary, белый bold)
 * или success-чек у пройденных; центр — продавец bodyStrong,
 * «Ряд R · место S», номер заказа + статус, «N позиций · Σ ₽»;
 * справа «+M м» табличными цифрами. Чекбокс «Пройдено» — зона
 * 48×48 (перчатки), отметка не меняет порядок маршрута (ADR 0017).
 * Тап по строке (вне чекбокса) — карточка заказа.
 */
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { formatPrice } from '../PriceDisplay';
import { OrderStatus, type OrderStatusType } from '../OrderStatus';
import { ORDER_STATUS_MAP } from '../OrderCard';
import { Text } from '../Text';

/** Маппинг статусов маршрута в словарь OrderStatus. */
const ROUTE_STATUS_MAP: Record<
  'CONFIRMED' | 'PREPARING' | 'READY',
  OrderStatusType
> = {
  CONFIRMED: ORDER_STATUS_MAP.CONFIRMED,
  PREPARING: ORDER_STATUS_MAP.PREPARING,
  READY: ORDER_STATUS_MAP.READY,
};

export interface RouteStopRowProps {
  index: number;
  sellerName: string;
  row: number;
  spot: number;
  orderNumber: string;
  status: 'CONFIRMED' | 'PREPARING' | 'READY';
  itemsCount: number;
  /** Итог заказа, копейки. */
  total: number;
  /** Метры от предыдущей точки (у первой — от входа). */
  legMeters: number;
  visited: boolean;
  onToggleVisited: () => void;
  onOpenOrder: () => void;
  testID?: string;
}

export function RouteStopRow({
  index,
  sellerName,
  row,
  spot,
  orderNumber,
  status,
  itemsCount,
  total,
  legMeters,
  visited,
  onToggleVisited,
  onOpenOrder,
  testID,
}: RouteStopRowProps) {
  const { colors, spacing, radii } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Остановка ${index}: ${sellerName}, ряд ${row}, место ${spot}`}
      onPress={onOpenOrder}
      testID={testID}
      style={({ pressed }) => [
        {
          minHeight: 72,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radii.lg,
          backgroundColor: pressed
            ? colors.surfaceMuted
            : visited
              ? colors.successSoft
              : 'transparent',
        },
      ]}
    >
      {/* Бейдж-номер / чек пройденной */}
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: visited ? colors.success : colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {visited ? (
          <Check size={16} color={colors.onPrimary} strokeWidth={2.6} />
        ) : (
          <Text
            variant="caption"
            style={{
              color: colors.onPrimary,
              fontWeight: '700',
              fontSize: 14,
            }}
          >
            {String(index)}
          </Text>
        )}
      </View>

      {/* Центр: продавец, позиция, статус+заказ (перенос снизу) */}
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {sellerName}
        </Text>
        <Text variant="caption" color="textMuted" mono numberOfLines={1}>
          {`Ряд ${row} · место ${spot}`}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            rowGap: 2,
            gap: spacing.sm,
          }}
        >
          <OrderStatus status={ROUTE_STATUS_MAP[status]} />
          {/* Номер заказа рядом с составом: строка переносится
              целиком, не наезжая на колонку метров (VLM, итерация 2). */}
          <Text
            variant="caption"
            color="textMuted"
            mono
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {`${orderNumber} · ${itemsCount} поз. · ${formatPrice(total)}`}
          </Text>
        </View>
      </View>

      {/* Метры от предыдущей точки (своя колонка — не наезжает
          на бейдж статуса: центр переносится, а не переполняется) */}
      <Text
        variant="bodySmall"
        color="textSecondary"
        mono
        style={{ minWidth: 52, textAlign: 'right' }}
      >
        {`+${legMeters} м`}
      </Text>

      {/* Чекбокс «Пройдено»: зона 48×48, тап не открывает заказ */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Остановка ${index} пройдена`}
        accessibilityState={{ checked: visited }}
        hitSlop={0}
        onPress={onToggleVisited}
        testID={testID ? `${testID}-visited` : undefined}
        style={({ pressed }) => [
          {
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: visited ? colors.primary : colors.border,
            backgroundColor: visited ? colors.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {visited ? (
            <Check size={16} color={colors.onPrimary} strokeWidth={2.6} />
          ) : null}
        </View>
      </Pressable>
    </Pressable>
  );
}
