/**
 * Клиент заказов (Промт 9, Часть E): /api/orders.
 *
 * Создание возвращает массив: позиции разных продавцов
 * группируются в отдельные заказы.
 */
import type { CreateOrderInput, Order, OrderList } from '@bazar/types';
import { apiRequest } from './client';
import { useContextStore } from '../../stores/contextStore';

/** Заголовок контура для запроса. */
function scopeHeaders(): Record<string, string> {
  const org = useContextStore.getState().active.organizationId;
  return org ? { 'X-Organization-Id': org } : {};
}

/** Создать заказ(ы) из позиций. */
export async function createOrder(input: CreateOrderInput): Promise<Order[]> {
  return apiRequest<Order[]>('/orders', {
    method: 'POST',
    auth: true,
    headers: scopeHeaders(),
    body: input,
  });
}

/** Список заказов покупателя (фильтры, пагинация). */
export async function fetchOrders(params: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<OrderList> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiRequest<OrderList>(`/orders${suffix}`, { auth: true });
}

/** Детали заказа (buyer или seller). */
export async function fetchOrder(orderId: string): Promise<Order> {
  return apiRequest<Order>(`/orders/${orderId}`, { auth: true });
}

/** Отменить заказ (PENDING/CONFIRMED). */
export async function cancelOrder(orderId: string): Promise<Order> {
  return apiRequest<Order>(`/orders/${orderId}/cancel`, {
    method: 'POST',
    auth: true,
  });
}
