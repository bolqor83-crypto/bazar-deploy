/**
 * OrderCard — карточка заказа в списке (Промт 9, Часть E).
 *
 * Номер табличными цифрами, дата, статус, состав заказа текстом
 * (Промт 12, доработка по VLM-аудиту: бежевые квадраты-заглушки
 * читались как «незавершённый» дизайн) и итог. Только презентация.
 */
import { Pressable, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { OrderStatus as ApiOrderStatus } from '@bazar/types';
import { useTheme } from '../../theme';
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
  /** Число позиций (для «ещё N» в сводке состава). */
  itemCount: number;
  /** Состав заказа для сводки: «Огурцы 12 кг · Помидоры 5 кг». */
  items?: { title: string; quantity: number; unit: string }[];
  /** Итог заказа, копейки. */
  totalKopecks: number;
  /** Продавец (вид покупателя). */
  sellerName?: string;
  /** Контрагент вместо продавца: имя покупателя в кабинете
   *  продавца (Промт 10, Часть C). Приоритетнее sellerName. */
  partyName?: string;
  /** Переход к деталям. */
  onPress: () => void;
  testID?: string;
}

export function OrderCard({
  number,
  status,
  createdAt,
  itemCount,
  items,
  totalKopecks,
  sellerName,
  partyName,
  onPress,
  testID,
}: OrderCardProps) {
  const { colors, spacing, radii } = useTheme();
  const party = partyName ?? sellerName;

  // Сводка состава: до двух позиций с количеством, дальше «ещё N».
  // Формат «Бананы 5 × 1 кг»: «5 1 кг» слитно читалось как опечатка
  // (VLM-аудит итерации 3).
  const summaryParts = (items ?? [])
    .slice(0, 2)
    .map((item) => `${item.title} ${item.quantity} × ${item.unit}`.trim());
  if (summaryParts.length > 0) {
    const restCount = itemCount - summaryParts.length;
    if (restCount > 0) {
      summaryParts.push(`ещё ${restCount}`);
    }
  }
  const summary =
    summaryParts.length > 0
      ? summaryParts.join(' · ')
      : `${itemCount} ${itemCount === 1 ? 'позиция' : 'позиций'}`;

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
          {/* Номер — главный идентификатор в B2B (VLM-аудит, итерация 3:
              цена доминировала над номером). */}
          <Text variant="bodyStrong" mono>
            {number}
          </Text>
          <Text variant="caption" color="textSecondary">
            {formatDate(createdAt)}
            {party ? ` · ${party}` : ''}
          </Text>
        </View>
        <OrderStatus status={STATUS_MAP[status]} />
      </View>

      {/* Состав заказа текстом + итог: квадраты-заглушки без
          подписей читались как пустые (VLM-аудит доработки). */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <Text
          variant="bodySmall"
          color="textSecondary"
          numberOfLines={2}
          style={{ flexShrink: 1 }}
        >
          {summary}
        </Text>
        <Text variant="body" mono>
          {formatPrice(totalKopecks)}
        </Text>
        {/* Шеврон — аффорданс перехода (VLM-аудит: «карточки без
            первичного действия»). */}
        <ChevronRight size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}
