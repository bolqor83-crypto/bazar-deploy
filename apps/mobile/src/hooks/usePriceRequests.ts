/**
 * Хуки запросов цены на TanStack Query (Промт 16, Часть C).
 *
 * Покупатель: список своих запросов + создание. Продавец:
 * входящие запросы организации + ответ ценой/отклонение.
 * Инвалидация: ['price-requests'] — обе стороны + уведомления.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PriceRequestList } from '@bazar/types';
import {
  createPriceRequest,
  declinePriceRequest,
  fetchIncomingPriceRequests,
  fetchMyPriceRequests,
  respondPriceRequest,
} from '../services/api/priceRequestApi';

/** Общая инвалидация после мутаций запросов цены. */
function invalidatePriceRequests(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: ['price-requests'] });
  void client.invalidateQueries({ queryKey: ['notifications'] });
}

/** Мои запросы цены (покупатель). */
export function useMyPriceRequests(status?: string) {
  return useQuery<PriceRequestList>({
    queryKey: ['price-requests', 'mine', status ?? 'all'],
    queryFn: () => fetchMyPriceRequests({ status, pageSize: 50 }),
  });
}

/** Входящие запросы (организация продавца). */
export function useIncomingPriceRequests(status?: string) {
  return useQuery<PriceRequestList>({
    queryKey: ['price-requests', 'incoming', status ?? 'all'],
    queryFn: () => fetchIncomingPriceRequests({ status, pageSize: 50 }),
  });
}

/** Создать запрос цены (покупатель). */
export function useCreatePriceRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createPriceRequest>[0]) =>
      createPriceRequest(input),
    onSuccess: () => invalidatePriceRequests(client),
  });
}

/** Ответить персональной ценой (продавец). */
export function useRespondPriceRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) =>
      respondPriceRequest(id, { price }),
    onSuccess: () => invalidatePriceRequests(client),
  });
}

/** Отклонить запрос (продавец). */
export function useDeclinePriceRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      declinePriceRequest(id, reason),
    onSuccess: () => invalidatePriceRequests(client),
  });
}
