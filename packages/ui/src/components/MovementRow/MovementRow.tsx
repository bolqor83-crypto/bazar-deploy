/**
 * MovementRow — компактная строка журнала движений (Промт 11b;
 * редизайн Промта 12, Часть A).
 *
 * Слева — иконка типа (32) и подпись bodyStrong («Приход»,
 * «Продажа»…), причина (caption) и склад/дата micro; справа —
 * дельта количества bodyStrong табличными цифрами: приходные типы —
 * success, расходные — терракота. offerTitle — позиция для общего
 * журнала склада. refType=order делает строку кнопкой со шевроном.
 */
import { Pressable, View } from 'react-native';
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightFromLine,
  ChevronRight,
  CornerUpLeft,
  Flag,
  Lock,
  LockOpen,
  PackageX,
  Scale,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Text } from '../Text';

/** Типы движений (срез STOCK_MOVEMENT_TYPES из @bazar/types). */
export type MovementType =
  | 'INITIAL'
  | 'RECEIPT'
  | 'SALE_OUT'
  | 'RETURN_IN'
  | 'WRITE_OFF'
  | 'ADJUSTMENT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'RESERVED'
  | 'UNRESERVED';

const TYPE_ICONS: Record<MovementType, LucideIcon> = {
  INITIAL: Flag,
  RECEIPT: ArrowDownToLine,
  SALE_OUT: ArrowRightFromLine,
  RETURN_IN: CornerUpLeft,
  WRITE_OFF: PackageX,
  ADJUSTMENT: Scale,
  TRANSFER_OUT: ArrowRightFromLine,
  TRANSFER_IN: ArrowLeftToLine,
  RESERVED: Lock,
  UNRESERVED: LockOpen,
};

const TYPE_LABELS: Record<MovementType, string> = {
  INITIAL: 'Начальный остаток',
  RECEIPT: 'Приход',
  SALE_OUT: 'Продажа',
  RETURN_IN: 'Возврат',
  WRITE_OFF: 'Списание',
  ADJUSTMENT: 'Корректировка',
  TRANSFER_OUT: 'Перемещение со склада',
  TRANSFER_IN: 'Перемещение на склад',
  RESERVED: 'Резерв заказа',
  UNRESERVED: 'Снятие резерва',
};

export interface MovementRowProps {
  type: MovementType;
  /** Дельта доступности: +50 / −20. */
  quantityDelta: number;
  /** Единица для дельты: «+50 кг» (VLM-аудит: без юнита
   *  журнал терял информативность). */
  unit?: string;
  /** Причина / комментарий. */
  reason: string;
  /** Склад, где прошло движение. */
  locationName: string;
  /** ISO-дата события. */
  createdAt: string;
  /** Позиция (общий журнал движений склада). */
  offerTitle?: string | null;
  /** Ссылка на связанный объект (order → переход). */
  linkLabel?: string | null;
  onPress?: () => void;
  testID?: string;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${date.getFullYear()}, ${hh}:${mi}`;
}

export function MovementRow({
  type,
  quantityDelta,
  unit,
  reason,
  locationName,
  createdAt,
  offerTitle,
  linkLabel,
  onPress,
  testID,
}: MovementRowProps) {
  const { colors } = useTheme();
  const Icon = TYPE_ICONS[type];
  const positive = quantityDelta >= 0;
  // Приходные — success; расходные — нейтральный textSecondary:
  // терракота/danger в numberL-весе читались как «красные цифры»
  // и нарушали спокойствие палитры (VLM-аудит доработки Промта 12).
  const deltaColor = positive ? colors.success : colors.textSecondary;
  // Типографский минус (U+2212) — как в PriceDisplay.
  const delta = positive
    ? `+${quantityDelta}${unit ? ` ${unit}` : ''}`
    : `−${Math.abs(quantityDelta)}${unit ? ` ${unit}` : ''}`;
  const label = TYPE_LABELS[type];

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 56,
        paddingVertical: 6,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel={label}
      >
        <Icon size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text
            variant="bodyStrong"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {label}
          </Text>
          {offerTitle ? (
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {offerTitle}
            </Text>
          ) : null}
          {linkLabel ? (
            <Text variant="caption" color="primaryText" numberOfLines={1}>
              {linkLabel}
            </Text>
          ) : null}
        </View>
        <Text variant="caption" color="textSecondary" numberOfLines={2}>
          {reason}
        </Text>
        {/* Дата и время — caption: micro 12 в mono читалось как
            «пропавшее» в тёмной теме (VLM-аудит доработки). */}
        <Text
          variant="caption"
          color="textMuted"
          mono
          numberOfLines={1}
          testID="datetime"
        >
          {`${formatDateTime(createdAt)} · ${locationName}`}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text variant="bodyStrong" mono style={{ color: deltaColor }}>
          {delta}
        </Text>
        {onPress ? <ChevronRight size={16} color={colors.textMuted} /> : null}
      </View>
    </View>
  );

  if (!onPress) {
    return (
      <View
        testID={testID}
        accessibilityLabel={`${label}, ${delta}, ${reason}`}
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
      accessibilityLabel={`${label}, ${delta}, ${reason}. Открыть связанный объект`}
      hitSlop={2}
    >
      {body}
    </Pressable>
  );
}
