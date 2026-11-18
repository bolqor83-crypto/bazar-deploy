/**
 * Карточка доставки (Промт 10, Часть D).
 *
 * Единый экран для всех участников: таймлайн жизненного цикла,
 * маршрут с контактами, груз и ставка. Действия зависят от роли:
 * перевозчик ведёт рейс (принять/забрал/в пути/доставил) и может
 * отменить принятую заявку; покупатель подтверждает получение и
 * отменяет заявку в ожидании; продавец отменяет заявку в ожидании.
 * Крупные кнопки (≥48) в нижней трети экрана.
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  MapPin,
  Package,
  Phone,
  Warehouse,
} from 'lucide-react-native';
import type { DeliveryStatus, Role } from '@bazar/types';
import {
  Button,
  Card,
  Dialog,
  ErrorState,
  DeliveryTimeline,
  Input,
  Skeleton,
  Text,
  useToast,
  useTheme,
} from '@bazar/ui';
import {
  useCancelDelivery,
  useCarrierDelivery,
  useCarrierDeliveryAction,
  useCompleteDelivery,
  useDelivery,
} from '../../hooks/useDeliveries';

/** Крупное действие перевозчика по текущему статусу. */
const CARRIER_PRIMARY: Partial<
  Record<
    DeliveryStatus,
    {
      action: 'accept' | 'picked-up' | 'in-transit' | 'delivered';
      label: string;
    }
  >
> = {
  PENDING: { action: 'accept', label: 'Принять заявку' },
  ACCEPTED: { action: 'picked-up', label: 'Забрал груз' },
  PICKED_UP: { action: 'in-transit', label: 'В пути' },
  IN_TRANSIT: { action: 'delivered', label: 'Доставил' },
};

function DetailSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={24} width="50%" />
      <Skeleton height={160} />
      <Skeleton height={120} />
      <Skeleton height={96} />
    </View>
  );
}

export interface DeliveryDetailScreenProps {
  /** Роль определяет набор действий. */
  role: Role;
  /** id доставки; обёртка маршрута берёт его из параметров. */
  deliveryId?: string;
}

export default function DeliveryDetailScreen({
  role,
  deliveryId,
}: DeliveryDetailScreenProps) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { show } = useToast();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');

  const carrierQuery = useCarrierDelivery(
    role === 'carrier' ? (deliveryId ?? '') : '',
  );
  const participantQuery = useDelivery(
    role === 'carrier' ? '' : (deliveryId ?? ''),
  );
  const query = role === 'carrier' ? carrierQuery : participantQuery;
  const carrierAct = useCarrierDeliveryAction();
  const complete = useCompleteDelivery();
  const cancel = useCancelDelivery();

  const delivery = query.data;

  const circleButton = (label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => router.back()}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <ChevronLeft size={22} color={colors.text} />
    </Pressable>
  );

  const header = (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      }}
    >
      {circleButton('Назад')}
      <Text variant="h2" mono style={{ flex: 1 }} numberOfLines={1}>
        {delivery?.number ?? 'Доставка'}
      </Text>
    </View>
  );

  if (query.isError) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {header}
        <ErrorState
          title="Доставка не загрузилась"
          description="Проверьте соединение и попробуйте снова"
          onRetry={() => void query.refetch()}
        />
      </ScrollView>
    );
  }

  if (query.isPending || !delivery) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {header}
        <DetailSkeleton />
      </ScrollView>
    );
  }

  const carrierPrimary = CARRIER_PRIMARY[delivery.status];
  const canCarrierCancel = role === 'carrier' && delivery.status === 'ACCEPTED';
  const canBuyerComplete =
    role === 'customer' && delivery.status === 'DELIVERED';
  const canRequesterCancel =
    delivery.status === 'PENDING' &&
    (role === 'customer' || role === 'wholesale_seller');

  const priceRub = delivery.price
    ? Math.round(delivery.price / 100).toLocaleString('ru-RU')
    : null;

  const onCarrierAction = (
    action: 'accept' | 'picked-up' | 'in-transit' | 'delivered',
    label: string,
    priceKopecks?: number,
  ) => {
    carrierAct.mutate(
      { id: delivery.id, action, priceKopecks },
      {
        onSuccess: () => show({ variant: 'success', message: label }),
        onError: () =>
          show({
            variant: 'error',
            message: 'Не получилось. Проверьте связь и попробуйте ещё раз',
          }),
      },
    );
  };

  const routeRow = (
    icon: typeof Warehouse,
    label: string,
    address: string,
    contact: string,
  ) => {
    const Icon = icon;
    return (
      <View style={{ flexDirection: 'row', gap: spacing.sm, minHeight: 48 }}>
        <View style={{ width: 24, alignItems: 'center', paddingTop: 3 }}>
          <Icon size={18} color={colors.textSecondary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="micro" color="textMuted">
            {label}
          </Text>
          <Text variant="body" numberOfLines={2}>
            {address}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            <Phone size={13} color={colors.textMuted} />
            <Text variant="caption" color="textSecondary">
              {contact}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View
      style={{ flex: 1, width: '100%', backgroundColor: colors.background }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          paddingBottom: spacing.xl,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          {circleButton('Назад')}
          <Text variant="h2" mono style={{ flex: 1 }} numberOfLines={1}>
            {delivery.number}
          </Text>
        </View>

        <Card variant="outlined">
          <Text variant="bodyStrong" style={{ marginBottom: spacing.md }}>
            Жизненный цикл
          </Text>
          <DeliveryTimeline
            status={delivery.status}
            testID="delivery-timeline"
          />
        </Card>

        <Card variant="outlined">
          <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
            Маршрут
          </Text>
          <View style={{ gap: spacing.md }}>
            {routeRow(
              Warehouse,
              'Забор',
              delivery.pickupAddress,
              delivery.pickupContact,
            )}
            {routeRow(
              MapPin,
              'Выгрузка',
              delivery.dropoffAddress,
              delivery.dropoffContact,
            )}
          </View>
        </Card>

        <Card variant="outlined">
          <Text variant="bodyStrong" style={{ marginBottom: spacing.sm }}>
            Груз и ставка
          </Text>
          <View style={{ gap: spacing.xs }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                minHeight: 32,
              }}
            >
              <Package size={18} color={colors.textSecondary} />
              <Text variant="body" style={{ flex: 1 }}>
                {delivery.weightKg || delivery.volumeL
                  ? [
                      delivery.weightKg ? `${delivery.weightKg} кг` : null,
                      delivery.volumeL ? `${delivery.volumeL} л` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : 'Груз не указан'}
              </Text>
              <Text variant="bodyStrong" mono testID="delivery-price">
                {priceRub ? `${priceRub} ₽` : '—'}
              </Text>
            </View>
            {delivery.cargoNotes ? (
              <Text variant="caption" color="textSecondary">
                {delivery.cargoNotes}
              </Text>
            ) : null}
          </View>
        </Card>

        <Card variant="outlined">
          <Text variant="bodyStrong" style={{ marginBottom: spacing.xs }}>
            Заказ и участники
          </Text>
          <View style={{ gap: spacing.xs }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                minHeight: 28,
                alignItems: 'center',
              }}
            >
              <Text variant="bodySmall" color="textSecondary">
                Заказ
              </Text>
              <Text variant="bodySmall" mono>
                {delivery.orderNumber}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                minHeight: 28,
                alignItems: 'center',
              }}
            >
              <Text variant="bodySmall" color="textSecondary">
                Заявку оформил
              </Text>
              <Text variant="bodySmall">{delivery.requesterName}</Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                minHeight: 28,
                alignItems: 'center',
              }}
            >
              <Text variant="bodySmall" color="textSecondary">
                Перевозчик
              </Text>
              <Text variant="bodySmall">
                {delivery.carrierName ?? 'Ещё не выбран'}
              </Text>
            </View>
          </View>
        </Card>

        {delivery.status === 'DELIVERED' && role === 'carrier' ? (
          <Card variant="outlined">
            <Text variant="body" color="textSecondary">
              Груз доставлен. Дождитесь подтверждения получателя — после него
              рейс считается завершённым.
            </Text>
          </Card>
        ) : null}

        {delivery.status === 'CANCELLED' && delivery.cancelReason ? (
          <Card variant="outlined">
            <Text variant="bodyStrong" style={{ marginBottom: spacing.xs }}>
              Причина отмены
            </Text>
            <Text variant="body" color="textSecondary">
              {delivery.cancelReason}
            </Text>
          </Card>
        ) : null}
      </ScrollView>

      {/* Действия — крупными кнопками в нижней трети экрана. */}
      {(carrierPrimary ||
        canCarrierCancel ||
        canBuyerComplete ||
        canRequesterCancel) && (
        <View
          style={{
            padding: spacing.lg,
            gap: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          {role === 'carrier' && carrierPrimary ? (
            carrierPrimary.action === 'accept' ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={() => {
                  setPriceInput('');
                  setAcceptOpen(true);
                }}
                testID="delivery-accept"
              >
                {carrierPrimary.label}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={carrierAct.isPending}
                onPress={() =>
                  onCarrierAction(carrierPrimary.action, carrierPrimary.label)
                }
                testID="delivery-primary-action"
              >
                {carrierPrimary.label}
              </Button>
            )
          ) : null}

          {canBuyerComplete ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={complete.isPending}
              onPress={() =>
                complete.mutate(delivery.id, {
                  onSuccess: () =>
                    show({
                      variant: 'success',
                      message: `Доставка ${delivery.number} завершена`,
                    }),
                  onError: () =>
                    show({
                      variant: 'error',
                      message: 'Не получилось. Попробуйте ещё раз',
                    }),
                })
              }
              testID="delivery-complete"
            >
              Подтвердить получение
            </Button>
          ) : null}

          {canCarrierCancel || canRequesterCancel ? (
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onPress={() => {
                setReasonInput('');
                setCancelOpen(true);
              }}
              testID="delivery-cancel"
            >
              {canCarrierCancel ? 'Отменить рейс' : 'Отменить заявку'}
            </Button>
          ) : null}
        </View>
      )}

      {/* Диалог принятия: необязательная ставка. */}
      <Dialog
        visible={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        title={`Принять заявку ${delivery.number}`}
        dismissable
      >
        <Text
          variant="body"
          color="textSecondary"
          style={{ marginBottom: spacing.md }}
        >
          Рейс появится в «Мои доставки». Ставку можно указать сейчас или
          согласовать с отправителем.
        </Text>
        <Input
          label="Ставка, ₽"
          placeholder="Например, 1500"
          value={priceInput}
          onChangeText={setPriceInput}
          keyboardType="numeric"
          accessibilityLabel="Ставка в рублях"
        />
        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={carrierAct.isPending}
            onPress={() => {
              const trimmed = priceInput.trim();
              const rubles = Number.parseInt(trimmed, 10);
              const kopecks =
                trimmed.length > 0 && Number.isFinite(rubles) && rubles >= 0
                  ? rubles * 100
                  : undefined;
              setAcceptOpen(false);
              onCarrierAction(
                'accept',
                `Заявка ${delivery.number} принята`,
                kopecks,
              );
            }}
            testID="delivery-accept-confirm"
          >
            Принять рейс
          </Button>
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() => setAcceptOpen(false)}
          >
            Позже
          </Button>
        </View>
      </Dialog>

      {/* Диалог отмены: причина обязательна. */}
      <Dialog
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={canCarrierCancel ? 'Отменить рейс?' : 'Отменить заявку?'}
        dismissable
      >
        <Text
          variant="body"
          color="textSecondary"
          style={{ marginBottom: spacing.md }}
        >
          {canCarrierCancel
            ? 'Укажите причину — её увидят отправитель и получатель.'
            : 'Укажите причину — её увидят участники доставки.'}
        </Text>
        <Input
          label="Причина"
          placeholder="Например, машина сломалась"
          value={reasonInput}
          onChangeText={setReasonInput}
          accessibilityLabel="Причина отмены"
        />
        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={reasonInput.trim().length === 0}
            loading={cancel.isPending}
            onPress={() => {
              setCancelOpen(false);
              cancel.mutate(
                { id: delivery.id, reason: reasonInput.trim() },
                {
                  onSuccess: () =>
                    show({
                      variant: 'info',
                      message: `Заявка ${delivery.number} отменена`,
                    }),
                  onError: () =>
                    show({
                      variant: 'error',
                      message: 'Не получилось отменить — заявка уже в работе',
                    }),
                },
              );
            }}
            testID="delivery-cancel-confirm"
          >
            Отменить
          </Button>
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() => setCancelOpen(false)}
          >
            Оставить
          </Button>
        </View>
      </Dialog>
    </View>
  );
}
