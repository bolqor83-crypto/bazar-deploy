/**
 * MovementRow — строка журнала движений (Промт 11b).
 *
 * Слева — иконка типа и подпись («Приход», «Продажа»…), причина
 * (одна строка) и склад; справа — дельта количества табличными
 * цифрами: приходные типы — success, расходные — терракота.
 * Дата и время — caption, tabular-nums. refType=order делает
 * строку кнопкой (переход в заказ) со стрелкой-шевроном.
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
  /** Причина / комментарий. */
  reason: string;
  /** Склад, где прошло движение. */
  locationName: string;
  /** ISO-дата события. */
  createdAt: string;
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
  reason,
  locationName,
  createdAt,
  linkLabel,
  onPress,
  testID,
}: MovementRowProps) {
  const { colors, spacing } = useTheme();
  const Icon = TYPE_ICONS[type];
  const positive = quantityDelta >= 0;
  const deltaColor = positive ? colors.success : colors.danger;
  // Типографский минус (U+2212) — как в PriceDisplay.
  const delta = positive ? `+${quantityDelta}` : `−${Math.abs(quantityDelta)}`;
  const label = TYPE_LABELS[type];

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 64,
        paddingVertical: spacing.sm,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel={label}
      >
        <Icon size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text variant="bodySmall" numberOfLines={1} style={{ flexShrink: 1 }}>
            {label}
          </Text>
          {linkLabel ? (
            <Text variant="caption" color="primaryText" numberOfLines={1}>
              {linkLabel}
            </Text>
          ) : null}
        </View>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {reason}
        </Text>
        <Text variant="caption" color="textMuted" mono numberOfLines={1}>
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
      hitSlop={4}
    >
      {body}
    </Pressable>
  );
}
