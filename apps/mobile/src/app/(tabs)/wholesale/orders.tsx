/**
 * Заказы кабинета продавца (Промт 10, Часть C).
 *
 * Рабочий инструмент рынка: фильтры-чипы по статусам (Новые ·
 * В работе · Готовы · Завершённые · Отменённые), поиск по номеру
 * и имени покупателя. Карточка — номер, покупатель, статус, итог.
 * Загрузка — Skeleton, пусто — EmptyState, ошибка — ErrorState.
 */
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardList } from 'lucide-react-native';
import {
  EmptyState,
  ErrorState,
  FilterChip,
  OrderCard,
  SearchBar,
  Skeleton,
  useTheme,
} from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import { useSellerOrders } from '../../../hooks/useSellerOrders';

/** Фильтры-чипы: группы статусов для продавца. */
const STATUS_FILTERS = [
  { key: 'new', label: 'Новые' },
  { key: 'active', label: 'В работе' },
  { key: 'ready', label: 'Готовы' },
  { key: 'completed', label: 'Завершённые' },
  { key: 'cancelled', label: 'Отменённые' },
  { key: 'all', label: 'Все' },
] as const;

type FilterKey = (typeof STATUS_FILTERS)[number]['key'];

/** Маппинг групп в API-статусы (запрос через запятую). */
const FILTER_TO_STATUSES: Record<FilterKey, string[] | undefined> = {
  new: ['PENDING'],
  active: ['CONFIRMED', 'PREPARING'],
  ready: ['READY'],
  completed: ['COMPLETED'],
  cancelled: ['CANCELLED'],
  all: undefined,
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

export default function SellerOrdersScreen() {
  const router = useRouter();
  const { spacing } = useTheme();
  const [filter, setFilter] = useState<FilterKey>('new');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const ordersQuery = useSellerOrders({
    statuses: FILTER_TO_STATUSES[filter],
    search: query.length > 0 ? query : undefined,
  });

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
      <SearchBar
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder="Номер заказа или покупатель"
        testID="seller-orders-search"
      />
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
            testID={`seller-orders-filter-${item.key}`}
          />
        ))}
      </ScrollView>
    </View>
  );

  let content: React.ReactNode;
  if (ordersQuery.isPending) {
    content = <OrdersSkeleton />;
  } else if (ordersQuery.isError) {
    content = (
      <ErrorState
        title="Заказы не загрузились"
        description="Проверьте соединение и попробуйте снова"
        onRetry={() => void ordersQuery.refetch()}
      />
    );
  } else if (orders.length === 0) {
    content = (
      <EmptyState
        icon={ClipboardList}
        title={filter === 'new' ? 'Новых заказов нет' : 'Заказов нет'}
        description={
          filter === 'new'
            ? 'Новые заказы покупателей появятся здесь и в уведомлениях.'
            : 'В этом фильтре пока пусто.'
        }
        testID="seller-orders-empty"
      />
    );
  } else {
    content = (
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xl,
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
            partyName={order.buyer.name}
            onPress={() => router.push(`/wholesale/orders/${order.id}`)}
            testID={`seller-order-card-${index}`}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <RoleScreen role="wholesale_seller" section="orders" title="Заказы">
      <View style={{ flex: 1, width: '100%' }}>
        {header}
        {content}
      </View>
    </RoleScreen>
  );
}
