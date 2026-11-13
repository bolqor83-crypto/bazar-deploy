/**
 * Заказы покупателя (Промт 9, Часть E).
 *
 * Скролл-чипы статусов (Все · Ожидают · В работе · Завершённые ·
 * Отменённые), список OrderCard, пустое состояние с переходом в
 * каталог, загрузка — Skeleton, ошибка — ErrorState.
 */
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Package } from 'lucide-react-native';
import {
  EmptyState,
  ErrorState,
  FilterChip,
  OrderCard,
  Skeleton,
  useTheme,
} from '@bazar/ui';
import { useOrders } from '../../hooks/useOrders';

/** Фильтры-чипы: человекочитаемые группы статусов. */
const STATUS_FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'pending', label: 'Ожидают' },
  { key: 'active', label: 'В работе' },
  { key: 'completed', label: 'Завершённые' },
  { key: 'cancelled', label: 'Отменённые' },
] as const;

type FilterKey = (typeof STATUS_FILTERS)[number]['key'];

/** Маппинг групп в API-статусы (запрос по одному статусу — упрощение). */
const FILTER_TO_STATUS: Record<FilterKey, string | undefined> = {
  all: undefined,
  pending: 'PENDING',
  active: 'CONFIRMED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

function OrdersSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={104} />
      <Skeleton height={104} />
      <Skeleton height={104} />
    </View>
  );
}

export interface OrdersScreenProps {
  basePath: 'customer' | 'store';
}

export default function OrdersScreen({ basePath }: OrdersScreenProps) {
  const router = useRouter();
  const { spacing } = useTheme();
  const [filter, setFilter] = useState<FilterKey>('all');
  const ordersQuery = useOrders(FILTER_TO_STATUS[filter]);

  const orders = ordersQuery.data?.items ?? [];

  const header = (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        gap: spacing.sm,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, minHeight: 48 }}
      >
        {STATUS_FILTERS.map((item) => (
          <FilterChip
            key={item.key}
            label={item.label}
            active={filter === item.key}
            onPress={() => setFilter(item.key)}
            testID={`orders-filter-${item.key}`}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {header}
        {ordersQuery.isError ? (
          <ErrorState
            title="Заказы не загрузились"
            description="Проверьте соединение и попробуйте снова"
            onRetry={() => void ordersQuery.refetch()}
          />
        ) : ordersQuery.isPending ? (
          <OrdersSkeleton />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Пока нет заказов"
            description="Соберите корзину и оформите первый заказ"
            action={{
              label: 'Перейти в каталог',
              onPress: () => router.push('/' + basePath + '/catalog'),
            }}
          />
        ) : (
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.lg,
              gap: spacing.md,
            }}
          >
            {orders.map((order, index) => (
              <OrderCard
                key={order.id}
                number={order.number}
                status={order.status}
                createdAt={order.createdAt}
                itemCount={order.items.length}
                totalKopecks={order.total}
                sellerName={order.seller.name}
                onPress={() =>
                  router.push(`/${basePath}/orders/${order.id}` as const)
                }
                testID={`order-card-${index}`}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
