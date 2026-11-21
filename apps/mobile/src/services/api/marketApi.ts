/**
 * Клиент рынка (Промт 17, Часть B): /api/market.
 *
 * Покупатель: маршрут по активным заказам. Продавец: позиция
 * организации на сетке рынка (X-Organization-Id).
 */
import type {
  ActiveUsersResponse,
  AnalyticsPeriod,
  AnomaliesResponse,
  MarketPosition,
  MarketRouteResponse,
  PriceTrendsResponse,
  SaveMarketPositionInput,
  VolumesResponse,
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

/*
 * Аналитика рынка — Layer 0 (Промт 18, Часть C; ADR 0019).
 * trends/volumes — публичные агрегаты; users/anomalies — контур
 * продавца (X-Organization-Id).
 */
export async function fetchPriceTrends(
  period: AnalyticsPeriod,
  categoryId?: string,
): Promise<PriceTrendsResponse> {
  const query = new URLSearchParams({ period });
  if (categoryId) {
    query.set('category', categoryId);
  }
  return apiRequest<PriceTrendsResponse>(`/market/trends?${query.toString()}`, {
    auth: false,
  });
}

export async function fetchVolumeTrends(
  period: AnalyticsPeriod,
): Promise<VolumesResponse> {
  return apiRequest<VolumesResponse>(`/market/volumes?period=${period}`, {
    auth: false,
  });
}

export async function fetchActiveUsers(
  period: AnalyticsPeriod,
): Promise<ActiveUsersResponse> {
  return apiRequest<ActiveUsersResponse>(`/market/users?period=${period}`, {
    auth: true,
    headers: orgHeaders(),
  });
}

export async function fetchAnomalies(
  period: AnalyticsPeriod,
): Promise<AnomaliesResponse> {
  return apiRequest<AnomaliesResponse>(`/market/anomalies?period=${period}`, {
    auth: true,
    headers: orgHeaders(),
  });
}
