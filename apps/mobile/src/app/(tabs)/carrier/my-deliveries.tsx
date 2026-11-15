/**
 * Мои доставки — экран роли «перевозчик» (Промт 10, Часть D).
 *
 * Сегменты «Активные» (принятые рейсы) и «История» (завершённые
 * и отменённые). Активный рейс — рабочий инструмент: карточка
 * маршрута и крупная кнопка следующего шага («Забрал груз» →
 * «В пути» → «Доставил») прямо в списке, в зоне большого пальца.
 */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Truck } from 'lucide-react-native';
import type { DeliveryStatus } from '@bazar/types';
import {
  Button,
  DeliveryRequestCard,
  Dialog,
  EmptyState,
  ErrorState,
  FilterChip,
  Skeleton,
  Text,
  useToast,
  useTheme,
} from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import {
  useCarrierDeliveries,
  useCarrierDeliveryAction,
} from '../../../hooks/useDeliveries';

/** Сегменты экрана. */
const SEGMENTS = [
  { key: 'active', label: 'Активные' },
  { key: 'history', label: 'История' },
] as const;
type SegmentKey = (typeof SEGMENTS)[number]['key'];

/** Активные статусы рейса. */
const ACTIVE: readonly DeliveryStatus[] = [
  'ACCEPTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
];

/** Следующий шаг активного рейса (кнопка на карточке). */
const NEXT_STEP: Partial<
  Record<
    DeliveryStatus,
    { action: 'picked-up' | 'in-transit' | 'delivered'; label: string }
  >
> = {
  ACCEPTED: { action: 'picked-up', label: 'Забрал груз' },
  PICKED_UP: { action: 'in-transit', label: 'В пути' },
  IN_TRANSIT: { action: 'delivered', label: 'Доставил' },
};

function ListSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={44} width="60%" />
      <Skeleton height={168} />
      <Skeleton height={168} />
    </View>
  );
}

export default function MyDeliveriesScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const { show } = useToast();
  const [segment, setSegment] = useState<SegmentKey>('active');
  const [confirmDelivery, setConfirmDelivery] = useState<string | null>(null);
  const mineQuery = useCarrierDeliveries('mine');
  const act = useCarrierDeliveryAction();

  const all = mineQuery.data?.items ?? [];
  const items =
    segment === 'active'
      ? all.filter((d) => ACTIVE.includes(d.status))
      : all.filter((d) => !ACTIVE.includes(d.status));

  const onAction = (
    id: string,
    action: 'picked-up' | 'in-transit' | 'delivered',
    label: string,
  ) => {
    act.mutate(
      { id, action },
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

  return (
    <RoleScreen role="carrier" section="my-deliveries" title="Рейсы">
      {mineQuery.isError ? (
        <ErrorState
          title="Доставки не загрузились"
          description="Проверьте соединение и попробуйте снова"
          onRetry={() => void mineQuery.refetch()}
        />
      ) : mineQuery.isPending ? (
        <ListSkeleton />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        >
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {SEGMENTS.map((s) => (
              <FilterChip
                key={s.key}
                label={s.label}
                active={segment === s.key}
                onPress={() => setSegment(s.key)}
                testID={`my-deliveries-segment-${s.key}`}
              />
            ))}
          </View>

          {items.length === 0 ? (
            <EmptyState
              icon={Truck}
              title={
                segment === 'active' ? 'Активных рейсов нет' : 'История пуста'
              }
              description={
                segment === 'active'
                  ? 'Примите заявку из ленты — она появится здесь со кнопками ведения рейса.'
                  : 'Завершённые и отменённые рейсы будут сохраняться здесь.'
              }
            />
          ) : (
            <>
              {segment === 'active' ? (
                <Text
                  variant="caption"
                  color="textMuted"
                  style={{ textAlign: 'center', paddingTop: spacing.xs }}
                >
                  Завершённые и отменённые рейсы — во вкладке «История»
                </Text>
              ) : null}
              {items.map((delivery) => {
                const next = NEXT_STEP[delivery.status];
                return (
                  <DeliveryRequestCard
                    key={delivery.id}
                    testID={`my-delivery-card-${delivery.id}`}
                    number={delivery.number}
                    status={delivery.status}
                    pickupAddress={delivery.pickupAddress}
                    dropoffAddress={delivery.dropoffAddress}
                    weightKg={delivery.weightKg}
                    volumeL={delivery.volumeL}
                    priceKopecks={delivery.price}
                    requesterName={delivery.requesterName}
                    onPress={() =>
                      router.push(`/carrier/deliveries/${delivery.id}`)
                    }
                  >
                    {next ? (
                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={act.isPending}
                        onPress={() => {
                          // «Доставил» — переход к подтверждению получателя:
                          // страхуемся от случайного тапа в списке.
                          if (next.action === 'delivered') {
                            setConfirmDelivery(delivery.id);
                          } else {
                            onAction(delivery.id, next.action, next.label);
                          }
                        }}
                        testID={`my-delivery-next-${delivery.id}`}
                      >
                        {next.label}
                      </Button>
                    ) : null}
                    {delivery.status === 'DELIVERED' ? (
                      <Text variant="caption" color="textSecondary">
                        Груз доставлен — ждём подтверждения получателя
                      </Text>
                    ) : null}
                  </DeliveryRequestCard>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {/* Подтверждение финального шага: защита от случайного тапа. */}
      <Dialog
        visible={confirmDelivery !== null}
        onClose={() => setConfirmDelivery(null)}
        title="Отметить доставку выполненной?"
        dismissable
      >
        <Text
          variant="body"
          color="textSecondary"
          style={{ marginBottom: spacing.lg }}
        >
          Получатель получит уведомление и подтвердит получение. До его
          подтверждения статус можно увидеть в деталях рейса.
        </Text>
        <View style={{ gap: spacing.sm }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={act.isPending}
            onPress={() => {
              const id = confirmDelivery;
              setConfirmDelivery(null);
              if (id)
                onAction(id, 'delivered', 'Доставка отмечена выполненной');
            }}
            testID="my-delivery-delivered-confirm"
          >
            Да, доставил
          </Button>
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() => setConfirmDelivery(null)}
          >
            Ещё в пути
          </Button>
        </View>
      </Dialog>
    </RoleScreen>
  );
}
