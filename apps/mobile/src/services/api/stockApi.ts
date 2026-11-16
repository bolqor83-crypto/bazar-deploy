/**
 * Клиент склада (Промт 11b): /api/stock/*.
 *
 * Склады, остатки, журнал движений, ручные движения и перемещения
 * организации продавца (X-Organization-Id, как в sellerApi).
 * Контракты — packages/types/src/stock.ts (ADR 0012).
 */
import type {
  CreateStockLocationInput,
  CreateStockMovementInput,
  StockBalanceList,
  StockBalance,
  StockLocation,
  StockMovementList,
  StockSummary,
  StockTransferInput,
  UpdateStockLocationInput,
} from '@bazar/types';
import { apiRequest } from './client';
import { useContextStore } from '../../stores/contextStore';

/** Заголовок организации продавца. */
function stockHeaders(): Record<string, string> {
  const org = useContextStore.getState().active.organizationId;
  return org ? { 'X-Organization-Id': org } : {};
}

/** Склады организации. */
export async function fetchStockLocations(): Promise<StockLocation[]> {
  return apiRequest<StockLocation[]>('/stock/locations', {
    auth: true,
    headers: stockHeaders(),
  });
}

/** Создать склад. */
export async function createStockLocation(
  input: CreateStockLocationInput,
): Promise<StockLocation> {
  return apiRequest<StockLocation>('/stock/locations', {
    method: 'POST',
    auth: true,
    headers: stockHeaders(),
    body: input,
  });
}

/** Обновить склад. */
export async function updateStockLocation(
  id: string,
  input: UpdateStockLocationInput,
): Promise<StockLocation> {
  return apiRequest<StockLocation>(`/stock/locations/${id}`, {
    method: 'PATCH',
    auth: true,
    headers: stockHeaders(),
    body: input,
  });
}

/** Удалить склад (сервер откажет, если есть движения). */
export async function deleteStockLocation(
  id: string,
): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/stock/locations/${id}`, {
    method: 'DELETE',
    auth: true,
    headers: stockHeaders(),
  });
}

/** Остатки организации (фильтры: склад, оффер). */
export async function fetchStockBalances(options: {
  locationId?: string | null;
  offerId?: string;
  page?: number;
  pageSize?: number;
}): Promise<StockBalanceList> {
  const query = new URLSearchParams();
  if (options.locationId) query.set('locationId', options.locationId);
  if (options.offerId) query.set('offerId', options.offerId);
  if (options.page) query.set('page', String(options.page));
  if (options.pageSize) query.set('pageSize', String(options.pageSize));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiRequest<StockBalanceList>(`/stock/balances${suffix}`, {
    auth: true,
    headers: stockHeaders(),
  });
}

/** Сводный остаток оффера по всем складам. */
export async function fetchStockSummary(
  offerId: string,
): Promise<StockSummary> {
  return apiRequest<StockSummary>(
    `/stock/summary?offerId=${encodeURIComponent(offerId)}`,
    { auth: true, headers: stockHeaders() },
  );
}

/** Журнал движений (фильтры: оффер, склад, тип, период). */
export async function fetchStockMovements(options: {
  offerId?: string;
  locationId?: string | null;
  type?: string;
  from?: number;
  to?: number;
  page?: number;
  pageSize?: number;
}): Promise<StockMovementList> {
  const query = new URLSearchParams();
  if (options.offerId) query.set('offerId', options.offerId);
  if (options.locationId) query.set('locationId', options.locationId);
  if (options.type) query.set('type', options.type);
  if (options.from) query.set('from', String(options.from));
  if (options.to) query.set('to', String(options.to));
  if (options.page) query.set('page', String(options.page));
  if (options.pageSize) query.set('pageSize', String(options.pageSize));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiRequest<StockMovementList>(`/stock/movements${suffix}`, {
    auth: true,
    headers: stockHeaders(),
  });
}

/** Ручное движение: приход / списание / корректировка. */
export async function createStockMovement(
  input: CreateStockMovementInput,
): Promise<StockMovementResult> {
  return apiRequest<StockMovementResult>('/stock/movements', {
    method: 'POST',
    auth: true,
    headers: stockHeaders(),
    body: input,
  });
}

/** Ответ ручного движения: обновлённый остаток и сводка. */
export interface StockMovementResult {
  balance: StockBalance;
  totals: StockSummary;
}

/** Перемещение между складами (атомарная пара движений). */
export async function transferStock(
  input: StockTransferInput,
): Promise<{ items: StockBalance[] }> {
  return apiRequest<{ items: StockBalance[] }>('/stock/transfer', {
    method: 'POST',
    auth: true,
    headers: stockHeaders(),
    body: input,
  });
}
