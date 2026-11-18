/**
 * Заказы покупателя (Промт 9, Часть E; Промт 15, Часть E).
 *
 * Скролл-чипы статусов (Все · Ожидают · В работе · Завершённые ·
 * Отменённые), список OrderCard, пустое состояние с переходом в
 * каталог, загрузка — Skeleton, ошибка — ErrorState.
 *
 * Промт 15: режим списка — «По продавцам» (группировка, по
 * умолчанию) или «По дате» (плоская хронология). Режим
 * персистится в AsyncStorage (bazar.orders.viewMode) и меняется
 * сразу при переключении. Фильтрация статусов — ДО группировки:
 * группы и суммы строятся по отфильтрованному набору.
 */
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Package } from 'lucide-react-native';
import {
  EmptyState,
  ErrorState,
  FilterChip,
  OrderCard,
  SegmentedControl,
  Skeleton,
  Text,
  useTheme,
} from '@bazar/ui';
import type { Order } from '@bazar/types';
import { useOrders } from '../../hooks/useOrders';
import { useOrdersViewMode } from '../../hooks/useOrdersViewMode';
import { OrdersGroupedList } from './OrdersGroupedList';

/** Фильтры-чипы: человекочитаемые группы статусов. Подписи
 *  короткие (глагольная форма): длинные «Завершённые» обрезались
 *  у края без признака скролла (VLM-аудит доработки Промта 12). */
const STATUS_FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'pending', label: 'Ожидают' },
  { key: 'active', label: 'В работе' },
  { key: 'completed', label: 'Завершён' },
  { key: 'cancelled', label: 'Отменён' },
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

const VIEW_MODE_OPTIONS = [
  { value: 'grouped', label: 'По продавцам' },
  { value: 'chronological', label: 'По дате' },
] as const;

/** Скелетон списка: 2 заголовка групп + 3 карточки (Промт 15). */
function OrdersSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={64} />
      <Skeleton height={104} />
      <Skeleton height={64} />
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
  const { viewMode, changeViewMode } = useOrdersViewMode();
  const ordersQuery = useOrders(FILTER_TO_STATUS[filter]);

  const orders: Order[] = ordersQuery.data?.items ?? [];

  // Группировка — чистая функция от контрагента: у покупателя
  // и точки контрагент — продавец заказа.
  const getSellerParty = useMemo(() => (order: Order) => order.seller, []);

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
      {/* Режим списка: персист в AsyncStorage, запись сразу
          при переключении (Промт 15, E). */}
      <SegmentedControl
        options={VIEW_MODE_OPTIONS}
        value={viewMode}
        onChange={changeViewMode}
        testID="orders-view-mode"
      />
    </View>
  );

  let content: React.ReactNode;
  if (ordersQuery.isError) {
    content = (
      <ErrorState
        title="Заказы не загрузились"
        description="Проверьте соединение и попробуйте снова"
        onRetry={() => void ordersQuery.refetch()}
      />
    );
  } else if (ordersQuery.isPending) {
    content = <OrdersSkeleton />;
  } else if (orders.length === 0) {
    content = (
      <EmptyState
        icon={Package}
        title="Пока нет заказов"
        description="Соберите корзину и оформите первый заказ"
        action={{
          label: 'Перейти в каталог',
          onPress: () => router.push('/' + basePath + '/catalog'),
        }}
      />
    );
  } else if (viewMode === 'grouped') {
    content = (
      <View
        style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}
      >
        <OrdersGroupedList
          orders={orders}
          getParty={getSellerParty}
          onOpenOrder={(orderId) =>
            router.push(`/${basePath}/orders/${orderId}` as const)
          }
          testIDPrefix="orders"
        />
        <View style={{ paddingTop: spacing.lg }} />
      </View>
    );
  } else {
    content = (
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
            items={order.items.map((item) => ({
              title: item.title,
              quantity: item.quantity,
              unit: item.unit,
            }))}
            totalKopecks={order.total}
            sellerName={order.seller.name}
            onPress={() =>
              router.push(`/${basePath}/orders/${order.id}` as const)
            }
            testID={`order-card-${index}`}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {header}
        {content}
        {orders.length > 0 ? (
          <View
            style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}
          >
            {/* Замыкающая подпись: пустота под списком читалась как
                недогруженный экран (VLM-аудит, итерация 3). */}
            <View style={{ height: spacing.md }} />
            <Text
              variant="caption"
              color="textMuted"
              style={{ textAlign: 'center' }}
            >
              Это все заказы
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
