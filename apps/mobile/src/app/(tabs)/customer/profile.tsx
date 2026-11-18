/**
 * Профиль (profile) — экран роли «покупатель».
 *
 * Сводка операций (два числа, tabular-nums), последние заказы
 * (быстрый доступ к деталям), уведомления, карточка пользователя
 * и выход. Рабочая плотность вместо полупустого экрана
 * (VLM-аудит, итерации 3–4).
 */
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight } from 'lucide-react-native';
import {
  Badge,
  Card,
  OrderStatus,
  ORDER_STATUS_MAP,
  Text,
  formatPrice,
  useTheme,
} from '@bazar/ui';
import { LogoutSection } from '../../../components/auth/LogoutSection';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import { useUnreadNotificationsCount } from '../../../hooks/useNotifications';
import { useOrders } from '../../../hooks/useOrders';
import type { Order } from '@bazar/types';

/** Сводка операций: два числа одинакового веса, подписи снизу. */
function OperationsSummary({ orders }: { orders: Order[] }) {
  const totalKopecks = orders.reduce((sum, order) => sum + order.total, 0);
  const inWork = orders.filter(
    (order) => order.status !== 'COMPLETED' && order.status !== 'CANCELLED',
  ).length;

  return (
    <Card variant="outlined" testID="profile-operations">
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text variant="numberL" color="primaryText">
            {orders.length}
          </Text>
          <Text variant="caption" color="textSecondary">
            {orders.length === 1 ? 'заказ' : 'заказа'}
            {inWork > 0 ? `, ${inWork} в работе` : ''}
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text variant="numberL">{formatPrice(totalKopecks)}</Text>
          <Text variant="caption" color="textSecondary">
            закуплено
          </Text>
        </View>
      </View>
    </Card>
  );
}

/** Компактная строка последнего заказа: номер, статус, сумма. */
function RecentOrderRow({ order }: { order: Order }) {
  const { spacing } = useTheme();
  const date = new Date(order.createdAt);
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
  const dateLabel = `${date.getDate()} ${months[date.getMonth()] ?? ''}`;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 48,
      }}
    >
      <View
        style={{
          flex: 1,
          gap: 2,
          flexShrink: 1,
          paddingRight: spacing.sm,
        }}
      >
        <Text
          variant="bodyStrong"
          mono
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {order.number}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {`${dateLabel} · ${order.items.length} поз.`}
        </Text>
      </View>
      <OrderStatus status={ORDER_STATUS_MAP[order.status]} />
      <Text variant="body" mono>
        {formatPrice(order.total)}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const unreadQuery = useUnreadNotificationsCount();
  const unread = unreadQuery.data ?? 0;
  const ordersQuery = useOrders();
  const orders = ordersQuery.data?.items ?? [];
  const recent = orders.slice(0, 2);

  return (
    <RoleScreen role="customer" section="profile" title="Профиль">
      {/* Промт 14b: воздух профиля — сетка 20 (padding lg), между
       * секциями spacing.lg. Карточки — outlined (часть C). */}
      <View style={{ padding: spacing.lg, gap: spacing.lg, width: '100%' }}>
        {orders.length > 0 ? <OperationsSummary orders={orders} /> : null}

        {recent.length > 0 ? (
          <Card variant="outlined">
            <Text variant="h3" style={{ marginBottom: spacing.sm }}>
              Последние заказы
            </Text>
            {recent.map((order) => (
              <RecentOrderRow key={order.id} order={order} />
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Все заказы"
              onPress={() => router.push('/customer/orders')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                minHeight: 44,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text variant="body" color="primaryText">
                Все заказы
              </Text>
              <ChevronRight size={18} color={colors.primaryText} />
            </Pressable>
          </Card>
        ) : null}

        <Card variant="outlined">
          <Pressable
            testID="profile-notifications"
            accessibilityRole="button"
            accessibilityLabel={
              unread > 0
                ? `Уведомления, непрочитанных: ${unread}`
                : 'Уведомления'
            }
            onPress={() => router.push('/customer/notifications')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              minHeight: 56,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Bell size={22} color={colors.text} />
            <Text variant="body" style={{ flex: 1 }}>
              Уведомления
            </Text>
            {/* Бейдж с alignSelf:flex-start прижимается к верху
                высокой строки (VLM 14b) — центрируем обёрткой. */}
            {unread > 0 ? (
              <View style={{ alignSelf: 'center' }}>
                <Badge variant="info" size="sm">
                  {unread > 99 ? '99+' : String(unread)}
                </Badge>
              </View>
            ) : null}
            <ChevronRight size={20} color={colors.textSecondary} />
          </Pressable>
        </Card>
        <LogoutSection />
      </View>
    </RoleScreen>
  );
}
