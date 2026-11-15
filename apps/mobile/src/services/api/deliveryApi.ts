/**
 * Клиент доставок (Промт 10, Часть D): /api/deliveries и
 * /api/carrier/deliveries.
 *
 * Заголовок X-Organization-Id — активная организация контекста
 * (guard на сервере проверит membership CARRIER для маршрутов
 * перевозчика).
 */
import type {
  CarrierDeliveryAction,
  CarrierDeliveryScope,
  CreateDeliveryInput,
  Delivery,
  DeliveryList,
} from '@bazar/types';
import { apiRequest } from './client';
import { useContextStore } from '../../stores/contextStore';

/** Заголовок организации перевозчика. */
function carrierHeaders(): Record<string, string> {
  const org = useContextStore.getState().active.organizationId;
  return org ? { 'X-Organization-Id': org } : {};
}

/** Создать заявку на доставку по заказу (buyer/seller). */
export async function createDelivery(
  input: CreateDeliveryInput,
): Promise<Delivery> {
  return apiRequest<Delivery>('/deliveries', {
    method: 'POST',
    auth: true,
    body: input,
  });
}

/** Детали доставки (участник: buyer, продавец, перевозчик). */
export async function fetchDelivery(id: string): Promise<Delivery> {
  return apiRequest<Delivery>(`/deliveries/${id}`, {
    auth: true,
  });
}

/** Подтвердить получение (покупатель): DELIVERED → COMPLETED. */
export async function completeDelivery(id: string): Promise<Delivery> {
  return apiRequest<Delivery>(`/deliveries/${id}/complete`, {
    method: 'POST',
    auth: true,
  });
}

/** Отменить заявку с причиной. */
export async function cancelDelivery(
  id: string,
  reason: string,
): Promise<Delivery> {
  return apiRequest<Delivery>(`/deliveries/${id}/cancel`, {
    method: 'POST',
    auth: true,
    body: { reason },
  });
}

/** Лента перевозчика: feed (свободные) или mine (рейсы организации). */
export async function fetchCarrierDeliveries(options: {
  scope: CarrierDeliveryScope;
  page?: number;
  pageSize?: number;
}): Promise<DeliveryList> {
  const query = new URLSearchParams();
  query.set('scope', options.scope);
  if (options.page) query.set('page', String(options.page));
  if (options.pageSize) query.set('pageSize', String(options.pageSize));
  return apiRequest<DeliveryList>(`/carrier/deliveries?${query.toString()}`, {
    auth: true,
    headers: carrierHeaders(),
  });
}

/** Детали доставки для перевозчика. */
export async function fetchCarrierDelivery(id: string): Promise<Delivery> {
  return apiRequest<Delivery>(`/carrier/deliveries/${id}`, {
    auth: true,
    headers: carrierHeaders(),
  });
}

/** Действие перевозчика: accept (со ставкой) и ведение рейса. */
export async function postCarrierDeliveryAction(
  id: string,
  action: CarrierDeliveryAction,
  priceKopecks?: number,
): Promise<Delivery> {
  const body =
    action === 'accept' && priceKopecks !== undefined
      ? { price: priceKopecks }
      : undefined;
  return apiRequest<Delivery>(`/carrier/deliveries/${id}/${action}`, {
    method: 'POST',
    auth: true,
    headers: carrierHeaders(),
    body,
  });
}
