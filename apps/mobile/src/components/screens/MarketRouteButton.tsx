/**
 * MarketRouteButton — кнопка «Маршрут по рынку» в шапке экрана
 * заказов (Промт 17, Часть B).
 *
 * IconButton (Lucide Route, монохром), виден при ≥1 активном
 * заказе (CONFIRMED / PREPARING / READY). Пока список грузится —
 * скрыта: кнопка без маршрута в 4 утра только путает.
 */
import { useRouter } from 'expo-router';
import { Route } from 'lucide-react-native';
import type { Order } from '@bazar/types';
import { IconButton } from '@bazar/ui';
import { useOrders } from '../../hooks/useOrders';

const ACTIVE_STATUSES = new Set(['CONFIRMED', 'PREPARING', 'READY']);

export function MarketRouteButton({
  basePath,
}: {
  basePath: 'customer' | 'store';
}) {
  const router = useRouter();
  const ordersQuery = useOrders();

  if (ordersQuery.isPending || ordersQuery.isError) {
    return null;
  }
  const orders: Order[] = ordersQuery.data?.items ?? [];
  const hasActive = orders.some((order) => ACTIVE_STATUSES.has(order.status));
  if (!hasActive) {
    return null;
  }
  return (
    <IconButton
      icon={Route}
      accessibilityLabel="Маршрут по рынку"
      size="sm"
      variant="ghost"
      haptic={false}
      onPress={() => router.push(`/${basePath}/market-route`)}
      testID="orders-market-route-button"
    />
  );
}
