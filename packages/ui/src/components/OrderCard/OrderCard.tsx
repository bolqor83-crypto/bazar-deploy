/**
 * OrderCard — карточка заказа в списке (Промт 9, Часть E).
 *
 * Номер табличными цифрами, дата, статус, превью позиций
 * (заглушки-тона до настоящих фото) и итог. Только презентация.
 */
import { Pressable, View } from 'react-native';
import type { OrderStatus as ApiOrderStatus } from '@bazar/types';
import { useTheme } from '../../theme';
import { placeholderTone } from '../../tokens/placeholder';
import { formatPrice } from '../PriceDisplay';
import { OrderStatus } from '../OrderStatus';
import { Text } from '../Text';
import type { OrderStatusType } from '../OrderStatus';

/** Маппинг статусов API (Промт 9) в словарь OrderStatus (Промт 6). */
const STATUS_MAP: Record<ApiOrderStatus, OrderStatusType> = {
  PENDING: 'new',
  CONFIRMED: 'confirmed',
  PREPARING: 'assembling',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/** Формат даты: «12 ноя, 08:30». */
function formatDate(iso: string): string {
  const date = new Date(iso);
  const months = [
    'янв',
    'фев',
    'мар',
    'апр',
    'мая',
    'июн',
    'июл',
    'авг',
    'сен',
    'окт',
    'ноя',
    'дек',
  ];
  const day = date.getDate();
  const month = months[date.getMonth()] ?? '';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month}, ${hh}:${mm}`;
}

export interface OrderCardProps {
  number: string;
  status: ApiOrderStatus;
  createdAt: string;
  /** Число позиций (для превью «+N»). */
  itemCount: number;
  /** Итог заказа, копейки. */
  totalKopecks: number;
  /** Продавец. */
  sellerName?: string;
  /** Переход к деталям. */
  onPress: () => void;
  testID?: string;
}

export function OrderCard({
  number,
  status,
  createdAt,
  itemCount,
  totalKopecks,
  sellerName,
  onPress,
  testID,
}: OrderCardProps) {
  const { colors, spacing, radii } = useTheme();
  const previewCount = Math.min(3, itemCount);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Заказ ${number} от ${formatDate(createdAt)}, ${formatPrice(totalKopecks)}`}
      onPress={onPress}
      style={({ pressed }) => ({
        gap: spacing.sm,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <View style={{ gap: 2 }}>
          <Text variant="bodySmall" mono>
            {number}
          </Text>
          <Text variant="caption" color="textSecondary">
            {formatDate(createdAt)}
            {sellerName ? ` · ${sellerName}` : ''}
          </Text>
        </View>
        <OrderStatus status={STATUS_MAP[status]} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        {/* Превью позиций: заглушки-тона + «+N». */}
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {Array.from({ length: previewCount }, (_, i) => (
            <View
              key={i}
              accessibilityLabel={`Позиция ${i + 1}`}
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.sm,
                backgroundColor: placeholderTone(i),
              }}
            />
          ))}
          {itemCount > previewCount ? (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.sm,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="caption" color="textSecondary" mono>
                +{itemCount - previewCount}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="bodyStrong" mono>
          {formatPrice(totalKopecks)}
        </Text>
      </View>
    </Pressable>
  );
}
