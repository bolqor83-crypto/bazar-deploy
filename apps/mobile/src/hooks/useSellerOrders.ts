/**
 * Хуки заказов продавца на TanStack Query (Промт 10, Часть C).
 *
 * Ключ ['seller-orders', ...]. Действие по заказу инвалидирует
 * список и детали — таймлайн событий обновляется сразу.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SellerOrder, SellerOrderAction } from '@bazar/types';
import {
  fetchSellerOrder,
  fetchSellerOrders,
  postSellerOrderAction,
} from '../services/api/sellerApi';

/** Список заказов организации (фильтр статусов, поиск). */
export function useSellerOrders(options: {
  statuses?: string[];
  search?: string;
}) {
  return useQuery({
    queryKey: [
      'seller-orders',
      options.statuses?.join(',') ?? 'all',
      options.search ?? '',
    ],
    queryFn: () => fetchSellerOrders(options),
  });
}

/** Детали заказа продавца. */
export function useSellerOrder(id: string) {
  return useQuery({
    queryKey: ['seller-orders', 'detail', id],
    queryFn: () => fetchSellerOrder(id),
    enabled: id.length > 0,
  });
}

/** Действие по заказу: confirm/preparing/ready/complete/cancel. */
export function useSellerOrderAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: SellerOrderAction }) =>
      postSellerOrderAction(id, action),
    onSuccess: (order: SellerOrder) => {
      client.setQueryData(['seller-orders', 'detail', order.id], order);
      void client.invalidateQueries({ queryKey: ['seller-orders'] });
    },
  });
}
