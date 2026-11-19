/**
 * Клиент запросов цены (Промт 16, Часть C): /api/price-requests.
 *
 * Покупатель: создать запрос, мои запросы. Продавец: входящие
 * запросы организации (X-Organization-Id), ответ ценой, отклонение.
 */
import type {
  CreatePriceRequestInput,
  PriceRequest,
  PriceRequestList,
  RespondPriceRequestInput,
} from '@bazar/types';
import { apiRequest } from './client';
import { useContextStore } from '../../stores/contextStore';

/** Заголовок контура организации продавца. */
function orgHeaders(): Record<string, string> {
  const org = useContextStore.getState().active.organizationId;
  return org ? { 'X-Organization-Id': org } : {};
}

/** Создать запрос цены (окупает priceOnRequest-оффер). */
export async function createPriceRequest(
  input: CreatePriceRequestInput,
): Promise<PriceRequest> {
  return apiRequest<PriceRequest>('/price-requests', {
    method: 'POST',
    auth: true,
    body: input,
  });
}

/** Мои запросы (покупатель): фильтр по статусу, пагинация. */
export async function fetchMyPriceRequests(params: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PriceRequestList> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiRequest<PriceRequestList>(`/price-requests${suffix}`, {
    auth: true,
  });
}

/** Входящие запросы организации продавца. */
export async function fetchIncomingPriceRequests(params: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PriceRequestList> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiRequest<PriceRequestList>(`/price-requests/incoming${suffix}`, {
    auth: true,
    headers: orgHeaders(),
  });
}

/** Ответить персональной ценой (копейки за единицу, 72 часа). */
export async function respondPriceRequest(
  id: string,
  input: RespondPriceRequestInput,
): Promise<PriceRequest> {
  return apiRequest<PriceRequest>(`/price-requests/${id}/respond`, {
    method: 'POST',
    auth: true,
    headers: orgHeaders(),
    body: input,
  });
}

/** Отклонить запрос (с причиной или без). */
export async function declinePriceRequest(
  id: string,
  reason?: string,
): Promise<PriceRequest> {
  return apiRequest<PriceRequest>(`/price-requests/${id}/decline`, {
    method: 'POST',
    auth: true,
    headers: orgHeaders(),
    body: reason ? { reason } : {},
  });
}
