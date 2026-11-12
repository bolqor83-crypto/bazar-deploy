/**
 * Карточка заказа (Промт 9, Часть E).
 *
 * Номер в шапке, статус + таймлайн, продавец (PartyCard), позиции,
 * итог (subtotal/delivery/total), адрес/самовывоз, комментарий.
 * «Отменить заказ» — только PENDING/CONFIRMED, с подтверждением.
 * «Связаться с продавцом» — заглушка (Промт 10).
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import {
  Button,
  Card,
  Dialog,
  ErrorState,
  OrderStatus,
  OrderTimeline,
  PartyCard,
  ProductRow,
  Skeleton,
  Text,
  useToast,
  useTheme,
} from '@bazar/ui';
import { useCancelOrder, useOrder } from '../../hooks/useOrders';

/** Маппинг статусов API в словарь OrderStatus (Промт 6). */
const STATUS_MAP: Record<
  string,
  'new' | 'confirmed' | 'assembling' | 'ready' | 'completed' | 'cancelled'
> = {
  PENDING: 'new',
  CONFIRMED: 'confirmed',
  PREPARING: 'assembling',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const CANCELLABLE = new Set(['PENDING', 'CONFIRMED']);

function OrderSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={24} width="50%" />
      <Skeleton height={140} />
      <Skeleton height={96} />
      <Skeleton height={72} />
    </View>
  );
}

export interface OrderDetailScreenProps {
  basePath: 'customer' | 'store';
  /** id заказа; обёртка маршрута берёт его из параметров. */
  orderId?: string;
}

export default function OrderDetailScreen({
  basePath,
  orderId,
}: OrderDetailScreenProps) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { show } = useToast();
  const params = useLocalSearchParams<{ id: string }>();
  const paramId = typeof params.id === 'string' ? params.id : '';
  const id = orderId ?? paramId;
  void basePath;
  const orderQuery = useOrder(id);
  const cancelOrder = useCancelOrder();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const order = orderQuery.data;

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
      <Text variant="h2" mono>
        {order?.number ?? 'Заказ'}
      </Text>
    </View>
  );

  if (orderQuery.isError) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {header}
        <ErrorState
          title="Заказ не загрузился"
          description="Проверьте соединение и попробуйте снова"
          onRetry={() => void orderQuery.refetch()}
        />
      </ScrollView>
    );
  }

  if (orderQuery.isPending || !order) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {header}
        <OrderSkeleton />
      </ScrollView>
    );
  }

  const canCancel = CANCELLABLE.has(order.status);
  const subtotalRub = Math.round(order.subtotal / 100).toLocaleString('ru-RU');
  const deliveryRub = Math.round(order.deliveryCost / 100).toLocaleString(
    'ru-RU',
  );
  const totalRub = Math.round(order.total / 100).toLocaleString('ru-RU');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
            {order.number}
          </Text>
          <OrderStatus status={STATUS_MAP[order.status] ?? 'new'} />
        </View>

        <Card>
          <Text variant="bodyStrong" style={{ marginBottom: spacing.md }}>
            Статус
          </Text>
          <OrderTimeline status={order.status} testID="order-timeline" />
        </Card>

        <PartyCard
          name={order.seller.name}
          subtitle="Продавец заказа"
          onPress={undefined}
        />

        <Card>
          <Text variant="bodyStrong" style={{ marginBottom: spacing.xs }}>
            Позиции
          </Text>
          {order.items.map((item) => (
            <ProductRow
              key={item.id}
              name={item.title}
              priceKopecks={item.price}
              quantity={item.quantity}
              unit={item.unit}
            />
          ))}
          <View
            style={{
              marginTop: spacing.sm,
              gap: spacing.xs,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                minHeight: 24,
              }}
            >
              <Text variant="bodySmall" color="textSecondary">
                Товары
              </Text>
              <Text variant="bodySmall" mono>
                {`${subtotalRub} ₽`}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                minHeight: 24,
              }}
            >
              <Text variant="bodySmall" color="textSecondary">
                Доставка
              </Text>
              <Text variant="bodySmall" mono>
                {order.deliveryCost > 0 ? `${deliveryRub} ₽` : '—'}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                minHeight: 32,
                alignItems: 'center',
              }}
            >
              <Text variant="bodyStrong">Итого</Text>
              <Text variant="h3" mono testID="order-total">
                {`${totalRub} ₽`}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text variant="bodyStrong" style={{ marginBottom: spacing.xs }}>
            Получение
          </Text>
          <Text variant="body" color="textSecondary">
            {order.address ? order.address : 'Самовывоз с точки продавца'}
          </Text>
        </Card>

        {order.comment ? (
          <Card>
            <Text variant="bodyStrong" style={{ marginBottom: spacing.xs }}>
              Комментарий
            </Text>
            <Text variant="body" color="textSecondary">
              {order.comment}
            </Text>
          </Card>
        ) : null}

        <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
          {canCancel ? (
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onPress={() => setCancelDialogOpen(true)}
              testID="order-cancel"
            >
              Отменить заказ
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() =>
              show({
                variant: 'info',
                message: 'Связь с продавцом появится в следующем обновлении',
              })
            }
          >
            Связаться с продавцом
          </Button>
        </View>
      </ScrollView>

      <Dialog
        visible={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        title="Отменить заказ?"
        dismissable={false}
      >
        <Text
          variant="body"
          color="textSecondary"
          style={{ marginBottom: spacing.lg }}
        >
          {`Заказ ${order.number} будет отменён, товары вернутся на склад продавца.`}
        </Text>
        <View style={{ gap: spacing.sm }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => {
              setCancelDialogOpen(false);
              cancelOrder.mutate(order.id, {
                onSuccess: () =>
                  show({
                    variant: 'info',
                    message: `Заказ ${order.number} отменён`,
                  }),
                onError: () =>
                  show({
                    variant: 'info',
                    message: 'Не удалось отменить: заказ уже в работе',
                  }),
              });
            }}
            testID="order-cancel-confirm"
          >
            Отменить заказ
          </Button>
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() => setCancelDialogOpen(false)}
          >
            Оставить
          </Button>
        </View>
      </Dialog>
    </View>
  );
}
