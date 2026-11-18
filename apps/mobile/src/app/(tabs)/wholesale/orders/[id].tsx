/**
 * Карточка заказа в кабинете продавца (Промт 10, Часть C).
 *
 * Покупатель (PartyCard с телефоном), позиции, итог, получение и
 * комментарий. Действия жизненного цикла — крупными кнопками
 * (≥ 48) в нижней части: Подтвердить → Собираем → Готов →
 * Завершить; отмена (только PENDING/CONFIRMED) — через Dialog.
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Phone } from 'lucide-react-native';
import {
  Button,
  Card,
  Dialog,
  ErrorState,
  OrderStatus,
  OrderTimeline,
  ProductRow,
  Skeleton,
  Text,
  useToast,
  useTheme,
} from '@bazar/ui';
import type { SellerOrderAction } from '@bazar/types';
import { RoleScreen } from '../../../../components/shell/RoleScreen';
import {
  useSellerOrder,
  useSellerOrderAction,
} from '../../../../hooks/useSellerOrders';
import { OrderDeliveryBlock } from '../../../../components/screens/OrderDeliveryBlock';

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

/** Статусы, в которых заказ можно отменить. */
const CANCELLABLE = new Set(['PENDING', 'CONFIRMED']);

/** Основное действие по текущему статусу. */
const PRIMARY_ACTION: Partial<
  Record<string, { action: SellerOrderAction; label: string }>
> = {
  PENDING: { action: 'confirm', label: 'Подтвердить заказ' },
  CONFIRMED: { action: 'preparing', label: 'Собираем' },
  PREPARING: { action: 'ready', label: 'Готов к выдаче' },
  READY: { action: 'complete', label: 'Завершить продажу' },
};

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

export default function SellerOrderDetailScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string }>();
  const orderId = typeof params.id === 'string' ? params.id : '';

  const orderQuery = useSellerOrder(orderId);
  const act = useSellerOrderAction();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const order = orderQuery.data;

  const onAct = (action: SellerOrderAction, label: string) => {
    act.mutate(
      { id: orderId, action },
      {
        onSuccess: () => toast.show({ variant: 'success', message: label }),
        onError: () =>
          toast.show({
            variant: 'error',
            message: 'Не получилось. Проверьте связь и попробуйте ещё раз',
          }),
      },
    );
  };

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
        {order?.number ?? 'Заказ'}
      </Text>
    </View>
  );

  if (orderQuery.isError) {
    return (
      <RoleScreen role="wholesale_seller" section="orders" title="Заказ">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {header}
          <ErrorState
            title="Заказ не загрузился"
            description="Проверьте соединение и попробуйте снова"
            onRetry={() => void orderQuery.refetch()}
          />
        </ScrollView>
      </RoleScreen>
    );
  }

  if (orderQuery.isPending || !order) {
    return (
      <RoleScreen role="wholesale_seller" section="orders" title="Заказ">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {header}
          <OrderSkeleton />
        </ScrollView>
      </RoleScreen>
    );
  }

  const primary = PRIMARY_ACTION[order.status];
  const canCancel = CANCELLABLE.has(order.status);
  const subtotalRub = Math.round(order.subtotal / 100).toLocaleString('ru-RU');
  const totalRub = Math.round(order.total / 100).toLocaleString('ru-RU');

  return (
    <RoleScreen role="wholesale_seller" section="orders" title="Заказ">
      <View style={{ flex: 1, width: '100%' }}>
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
            <Text variant="h2" mono style={{ flex: 1 }} numberOfLines={2}>
              {order.number}
            </Text>
            <OrderStatus status={STATUS_MAP[order.status] ?? 'new'} />
          </View>

          <Card variant="outlined">
            <Text variant="bodyStrong" style={{ marginBottom: spacing.md }}>
              Жизненный цикл
            </Text>
            <OrderTimeline
              status={order.status}
              testID="seller-order-timeline"
            />
          </Card>

          {/* Промт 10, Часть D: заявка на доставку по заказу. */}
          <OrderDeliveryBlock
            orderId={order.id}
            orderStatus={order.status}
            delivery={order.delivery}
            basePath="wholesale"
          />

          <Card variant="outlined">
            <Text variant="bodyStrong" style={{ marginBottom: spacing.xs }}>
              Покупатель
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                minHeight: 48,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="body">{order.buyer.name}</Text>
                <Text variant="caption" color="textSecondary" mono>
                  {order.buyer.phone}
                </Text>
              </View>
              <Phone size={20} color={colors.textSecondary} />
            </View>
          </Card>

          <Card variant="outlined">
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
                  minHeight: 32,
                  alignItems: 'center',
                }}
              >
                <Text variant="bodyStrong">Итого к оплате</Text>
                <Text variant="h3" mono testID="seller-order-total">
                  {`${totalRub} ₽`}
                </Text>
              </View>
            </View>
          </Card>

          <Card variant="outlined">
            <Text variant="bodyStrong" style={{ marginBottom: spacing.xs }}>
              Получение
            </Text>
            <Text variant="body" color="textSecondary">
              {order.address ? order.address : 'Самовывоз со склада'}
            </Text>
          </Card>

          {order.comment ? (
            <Card variant="outlined">
              <Text variant="bodyStrong" style={{ marginBottom: spacing.xs }}>
                Комментарий покупателя
              </Text>
              <Text variant="body" color="textSecondary">
                {order.comment}
              </Text>
            </Card>
          ) : null}
        </ScrollView>

        {/* Действия — крупными кнопками в нижней трети экрана. */}
        {(primary || canCancel) && (
          <View
            style={{
              padding: spacing.lg,
              gap: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            }}
          >
            {primary ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={act.isPending}
                onPress={() =>
                  onAct(
                    primary.action,
                    `Заказ ${order.number}: ${primary.label.toLowerCase()}`,
                  )
                }
                testID="seller-order-primary-action"
              >
                {primary.label}
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                variant="ghost"
                size="lg"
                fullWidth
                onPress={() => setCancelDialogOpen(true)}
                testID="seller-order-cancel"
              >
                Отменить заказ
              </Button>
            ) : null}
          </View>
        )}

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
            {`Заказ ${order.number} будет отменён, товары вернутся на склад, покупатель получит уведомление.`}
          </Text>
          <View style={{ gap: spacing.sm }}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => {
                setCancelDialogOpen(false);
                onAct('cancel', `Заказ ${order.number} отменён`);
              }}
              testID="seller-order-cancel-confirm"
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
    </RoleScreen>
  );
}
