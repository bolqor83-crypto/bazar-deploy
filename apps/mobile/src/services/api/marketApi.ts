/**
 * Клиент рынка (Промт 17, Часть B): /api/market.
 *
 * Покупатель: маршрут по активным заказам. Продавец: позиция
 * организации на сетке рынка (X-Organization-Id).
 */
import type {
  MarketPosition,
  MarketRouteResponse,
  SaveMarketPositionInput,
} from '@bazar/types';
import { apiRequest } from './client';
import { useContextStore } from '../../stores/contextStore';

/** Заголовок контура организации продавца. */
function orgHeaders(): Record<string, string> {
  const org = useContextStore.getState().active.organizationId;
  return org ? { 'X-Organization-Id': org } : {};
}

/** Маршрут по рынку (покупатель; свои активные заказы). */
export async function fetchMarketRoute(params: {
  returnToStart: boolean;
  orderIds?: string[];
}): Promise<MarketRouteResponse> {
  const query = new URLSearchParams();
  query.set('returnToStart', String(params.returnToStart));
  if (params.orderIds && params.orderIds.length > 0) {
    query.set('orderIds', params.orderIds.join(','));
  }
  return apiRequest<MarketRouteResponse>(`/market/route?${query.toString()}`, {
    auth: true,
  });
}

/** Позиция организации на рынке (null — не задана). */
export async function fetchMarketPosition(): Promise<MarketPosition | null> {
  const response = await apiRequest<{ position: MarketPosition | null }>(
    '/market/position',
    { auth: true, headers: orgHeaders() },
  );
  return response.position;
}

/** Сохранить позицию организации на рынке. */
export async function saveMarketPosition(
  input: SaveMarketPositionInput,
): Promise<MarketPosition> {
  return apiRequest<MarketPosition>('/market/position', {
    method: 'PUT',
    auth: true,
    headers: orgHeaders(),
    body: input,
  });
}

/** Снять позицию организации с рынка. */
export async function clearMarketPosition(): Promise<{ cleared: boolean }> {
  return apiRequest<{ cleared: boolean }>('/market/position', {
    method: 'DELETE',
    auth: true,
    headers: orgHeaders(),
  });
}
