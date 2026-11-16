/**
 * DeliveryRequestCard — карточка заявки на доставку (Промт 10,
 * Часть D).
 *
 * Рабочий инструмент перевозчика: номер табличными цифрами,
 * маршрут «забор → выгрузка» с иконками, груз (кг/л), ставка и
 * статус. children — слот действий («Принять» в ленте, кнопки
 * ведения рейса в «моих»). Только презентация.
 */
import { Pressable, View } from 'react-native';
import type { ReactNode } from 'react';
import { MapPin, Warehouse } from 'lucide-react-native';
import type { DeliveryStatus } from '@bazar/types';
import { DELIVERY_STATUS_LABELS } from '@bazar/types';
import { useTheme } from '../../theme';
import { Badge, type BadgeVariant } from '../Badge';
import { formatPrice } from '../PriceDisplay';
import { Text } from '../Text';

/** Статус → вариант Badge (янтарь и терракота, красного нет). */
const STATUS_BADGE: Record<DeliveryStatus, BadgeVariant> = {
  PENDING: 'warning',
  ACCEPTED: 'info',
  PICKED_UP: 'info',
  IN_TRANSIT: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export interface DeliveryRequestCardProps {
  number: string;
  status: DeliveryStatus;
  pickupAddress: string;
  dropoffAddress: string;
  weightKg?: number | null;
  volumeL?: number | null;
  /** Ставка перевозчика в копейках (после принятия). */
  priceKopecks?: number | null;
  /** Контрагент-инициатор (контекст ленты). */
  requesterName?: string;
  /** Переход к деталям (карточка целиком). */
  onPress?: () => void;
  /** Слот действий: «Принять», кнопки ведения рейса. */
  children?: ReactNode;
  testID?: string;
}

export function DeliveryRequestCard({
  number,
  status,
  pickupAddress,
  dropoffAddress,
  weightKg,
  volumeL,
  priceKopecks,
  requesterName,
  onPress,
  children,
  testID,
}: DeliveryRequestCardProps) {
  const { colors, spacing, radii } = useTheme();

  const cargo: string[] = [];
  if (weightKg) cargo.push(`${weightKg} кг`);
  if (volumeL) cargo.push(`${volumeL} л`);

  const routeRow = (
    icon: typeof Warehouse,
    label: string,
    address: string,
    testId: string,
  ) => {
    const Icon = icon;
    return (
      <View
        testID={testId}
        style={{ flexDirection: 'row', gap: spacing.sm, minHeight: 32 }}
      >
        <View style={{ width: 24, alignItems: 'center', paddingTop: 3 }}>
          <Icon size={18} color={colors.textSecondary} />
        </View>
        <View style={{ flex: 1, gap: 0 }}>
          <Text variant="micro" color="textMuted">
            {label}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {address}
          </Text>
        </View>
      </View>
    );
  };

  const body = (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Text
            variant="bodySmall"
            mono
            testID={testID ? `${testID}-number` : undefined}
          >
            {number}
          </Text>
          {requesterName ? (
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {requesterName}
            </Text>
          ) : null}
        </View>
        <Badge variant={STATUS_BADGE[status]}>
          {DELIVERY_STATUS_LABELS[status]}
        </Badge>
      </View>

      {routeRow(Warehouse, 'Забор', pickupAddress, 'delivery-card-pickup')}
      {routeRow(MapPin, 'Выгрузка', dropoffAddress, 'delivery-card-dropoff')}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          minHeight: 28,
        }}
      >
        <Text variant="caption" color="textSecondary" mono>
          {cargo.length > 0 ? cargo.join(' · ') : 'Груз не указан'}
        </Text>
        {priceKopecks ? (
          <Text variant="bodySmall" mono color="primaryText">
            {formatPrice(priceKopecks)}
          </Text>
        ) : null}
      </View>

      {children ? <View style={{ gap: spacing.sm }}>{children}</View> : null}
    </View>
  );

  if (!onPress) {
    return (
      <View
        testID={testID}
        accessibilityLabel={`Доставка ${number}, ${DELIVERY_STATUS_LABELS[status]}`}
        style={{
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
        }}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Доставка ${number}, ${DELIVERY_STATUS_LABELS[status]}`}
      onPress={onPress}
      style={({ pressed }) => ({
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.lg,
        backgroundColor: colors.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {body}
    </Pressable>
  );
}
