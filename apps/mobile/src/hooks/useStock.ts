/**
 * Хуки склада на TanStack Query (Промт 11b).
 *
 * Ключи ['stock', ...] — единая инвалидация после движений и
 * перемещений. Обзор соединяет остатки (по складам) с активными
 * предложениями организации: balances API не отдаёт карточку
 * товара, join выполняется на клиенте по offerId.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CreateStockLocationInput,
  CreateStockMovementInput,
  SellerOffer,
  StockBalance,
  StockLocation,
  StockMovementList,
  StockTransferInput,
  UpdateStockLocationInput,
} from '@bazar/types';
import {
  createStockLocation,
  createStockMovement,
  deleteStockLocation,
  fetchStockBalances,
  fetchStockLocations,
  fetchStockMovements,
  fetchStockSummary,
  transferStock,
  updateStockLocation,
} from '../services/api/stockApi';
import { fetchSellerOffers } from '../services/api/sellerApi';
import { stockLevelOf } from '@bazar/ui';

/** Ключ списка остатков (зависит от фильтров). */
function balancesKey(locationId: string | null, offerId?: string) {
  return ['stock', 'balances', locationId, offerId ?? ''] as const;
}

/** Склады организации. */
export function useStockLocations() {
  return useQuery({
    queryKey: ['stock', 'locations'],
    queryFn: fetchStockLocations,
    staleTime: 60_000,
  });
}

/** Остатки организации (постранично, фильтр по складу/офферу). */
export function useStockBalances(options: {
  locationId?: string | null;
  offerId?: string;
  pageSize?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: balancesKey(options.locationId ?? null, options.offerId),
    queryFn: () =>
      fetchStockBalances({
        locationId: options.locationId ?? undefined,
        offerId: options.offerId,
        pageSize: options.pageSize ?? 50,
      }),
    enabled: options.enabled ?? true,
  });
}

/** Сводный остаток оффера по всем складам. */
export function useStockSummary(offerId: string) {
  return useQuery({
    queryKey: ['stock', 'summary', offerId],
    queryFn: () => fetchStockSummary(offerId),
    enabled: typeof offerId === 'string' && offerId.length > 0,
  });
}

/** Журнал движений с бесконечной прокруткой. */
export function useStockMovements(options: {
  offerId?: string;
  locationId?: string | null;
  type?: string;
  pageSize?: number;
}) {
  return useInfiniteQuery({
    queryKey: [
      'stock',
      'movements',
      options.offerId ?? '',
      options.locationId ?? '',
      options.type ?? '',
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchStockMovements({
        offerId: options.offerId,
        locationId: options.locationId ?? undefined,
        type: options.type,
        page: pageParam,
        pageSize: options.pageSize ?? 20,
      }),
    getNextPageParam: (last: StockMovementList) =>
      last.hasMore ? last.page + 1 : undefined,
  });
}

/** Строка обзора: предложение + агрегированный остаток. */
export interface StockOverviewRow {
  offer: SellerOffer;
  /** Суммарно по выбранным складам. */
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
  /** Складов с ненулевым остатком. */
  locationsCount: number;
}

/** Итоги обзора для карточек-сводки. */
export interface StockOverviewTotals {
  positions: number;
  units: number;
  low: number;
  out: number;
}

/** Соединить остатки с предложениями (balances без карточки товара). */
function joinBalancesWithOffers(
  balances: StockBalance[],
  offers: SellerOffer[],
): StockOverviewRow[] {
  const byOffer = new Map<string, StockOverviewRow>();
  for (const offer of offers) {
    byOffer.set(offer.id, {
      offer,
      physicalQty: 0,
      reservedQty: 0,
      availableQty: 0,
      locationsCount: 0,
    });
  }
  for (const balance of balances) {
    let row = byOffer.get(balance.offerId);
    if (!row) {
      continue;
    }
    row = {
      ...row,
      physicalQty: row.physicalQty + balance.physicalQty,
      reservedQty: row.reservedQty + balance.reservedQty,
      availableQty: row.availableQty + balance.availableQty,
      locationsCount: row.locationsCount + 1,
    };
    byOffer.set(balance.offerId, row);
  }
  return [...byOffer.values()];
}

/** Уровень остатка переиспользуется из дизайн-системы (StockRow). */
export { stockLevelOf };

/**
 * Обзор склада: активные предложения × остатки. «Все склады» —
 * суммирование строк по offerId; конкретный склад — срез строк.
 */
export function useStockOverview(locationId: string | null) {
  const balancesQuery = useStockBalances({ locationId, pageSize: 50 });
  const offersQuery = useQuery({
    queryKey: ['seller', 'offers', 'stock-overview'],
    queryFn: () => fetchSellerOffers({ archived: false, pageSize: 100 }),
  });

  const balances = balancesQuery.data?.items ?? [];
  const offers = offersQuery.data?.items ?? [];
  const rows = joinBalancesWithOffers(balances, offers);

  const totals: StockOverviewTotals = {
    positions: rows.filter((r) => r.physicalQty > 0 || r.reservedQty > 0)
      .length,
    units: rows.reduce((sum, r) => sum + r.physicalQty, 0),
    low: rows.filter(
      (r) =>
        r.availableQty > 0 &&
        stockLevelOf(r.availableQty, r.offer.minQuantity) === 'low',
    ).length,
    out: rows.filter(
      (r) => r.availableQty <= 0 && (r.physicalQty > 0 || r.reservedQty > 0),
    ).length,
  };

  return {
    rows,
    totals,
    offers,
    isLoading: balancesQuery.isLoading || offersQuery.isLoading,
    isError: balancesQuery.isError || offersQuery.isError,
    refetch: () => {
      void balancesQuery.refetch();
      void offersQuery.refetch();
    },
  };
}

/** Инвалидация всех складских данных после мутации. */
function useInvalidateStock() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: ['stock'] });
    // Остаток виден в списках предложений и каталоге.
    void client.invalidateQueries({ queryKey: ['seller', 'offers'] });
    void client.invalidateQueries({ queryKey: ['catalog'] });
  };
}

/** Ручное движение: приход / списание / корректировка. */
export function useCreateStockMovement() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (input: CreateStockMovementInput) => createStockMovement(input),
    onSuccess: invalidate,
  });
}

/** Перемещение между складами. */
export function useTransferStock() {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (input: StockTransferInput) => transferStock(input),
    onSuccess: invalidate,
  });
}

/** Создать склад. */
export function useCreateStockLocation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStockLocationInput) => createStockLocation(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['stock', 'locations'] });
    },
  });
}

/** Обновить склад. */
export function useUpdateStockLocation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateStockLocationInput;
    }) => updateStockLocation(id, input),
    onSuccess: (location: StockLocation) => {
      client.setQueryData<StockLocation[]>(['stock', 'locations'], (old) =>
        old ? old.map((l) => (l.id === location.id ? location : l)) : old,
      );
      void client.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}

/** Удалить склад (409, если есть движения). */
export function useDeleteStockLocation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStockLocation(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['stock'] });
    },
  });
}
