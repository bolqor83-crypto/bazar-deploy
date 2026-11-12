/**
 * Хуки заказов на TanStack Query (Промт 9, Часть E).
 *
 * Создание заказа инвалидирует и корзину (бэкенд её не чистит —
 * очищаем локально после успеха), и список заказов.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateOrderInput, Order } from '@bazar/types';
import {
  cancelOrder,
  createOrder,
  fetchOrder,
  fetchOrders,
} from '../services/api/orderApi';
import { useContextStore } from '../stores/contextStore';

/** Список заказов (фильтр по статусу). */
export function useOrders(status?: string) {
  return useQuery({
    queryKey: ['orders', status ?? 'all'],
    queryFn: () => fetchOrders({ status }),
  });
}

/** Детали заказа. */
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ['orders', 'detail', orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: orderId.length > 0,
  });
}

/** Создать заказ(ы) из позиций корзины. */
export function useCreateOrder() {
  const client = useQueryClient();
  const organizationId = useContextStore(
    (state) => state.active.organizationId,
  );
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: (orders: Order[]) => {
      client.setQueryData(['cart', organizationId], {
        items: [],
        subtotal: 0,
        warnings: [],
      });
      void client.invalidateQueries({ queryKey: ['orders'] });
      void orders;
    },
  });
}

/** Отменить заказ (PENDING/CONFIRMED). */
export function useCancelOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => cancelOrder(orderId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
