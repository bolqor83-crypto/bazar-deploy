/**
 * Хуки доставок на TanStack Query (Промт 10, Часть D).
 *
 * Ключи ['carrier-deliveries', scope] и ['deliveries', 'detail', id].
 * Действия перевозчика инвалидируют ленту и детали; создание
 * заявки инвалидирует заказ (в карточке появляется блок доставки).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CarrierDeliveryAction,
  CarrierDeliveryScope,
  CreateDeliveryInput,
} from '@bazar/types';
import {
  cancelDelivery,
  completeDelivery,
  createDelivery,
  fetchCarrierDeliveries,
  fetchCarrierDelivery,
  fetchDelivery,
  postCarrierDeliveryAction,
} from '../services/api/deliveryApi';
import { useContextStore } from '../stores/contextStore';

/** Активная организация перевозчика (в ключе запроса — смена
 *  организации пересобирает запрос, а не стреляет с пустым
 *  заголовком X-Organization-Id). */
function useCarrierOrgId(): string | null {
  return useContextStore((s) => s.active.organizationId);
}

/** Лента перевозчика (feed/mine). */
export function useCarrierDeliveries(scope: CarrierDeliveryScope) {
  const organizationId = useCarrierOrgId();
  return useQuery({
    queryKey: ['carrier-deliveries', scope, organizationId],
    queryFn: () => fetchCarrierDeliveries({ scope, pageSize: 30 }),
    enabled: organizationId !== null,
  });
}

/** Детали доставки для перевозчика. */
export function useCarrierDelivery(id: string) {
  const organizationId = useCarrierOrgId();
  return useQuery({
    queryKey: ['carrier-deliveries', 'detail', id, organizationId],
    queryFn: () => fetchCarrierDelivery(id),
    enabled: id.length > 0 && organizationId !== null,
  });
}

/** Детали доставки для участника (buyer/продавец). */
export function useDelivery(id: string) {
  return useQuery({
    queryKey: ['deliveries', 'detail', id],
    queryFn: () => fetchDelivery(id),
    enabled: id.length > 0,
  });
}

/** Создать заявку на доставку по заказу. */
export function useCreateDelivery() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDeliveryInput) => createDelivery(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['orders'] });
      void client.invalidateQueries({ queryKey: ['deliveries'] });
      void client.invalidateQueries({ queryKey: ['carrier-deliveries'] });
    },
  });
}

/** Действие перевозчика: принять / вести рейс. */
export function useCarrierDeliveryAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      priceKopecks,
    }: {
      id: string;
      action: CarrierDeliveryAction;
      priceKopecks?: number;
    }) => postCarrierDeliveryAction(id, action, priceKopecks),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['carrier-deliveries'] });
      void client.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/** Завершить доставку (покупатель подтверждает получение). */
export function useCompleteDelivery() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeDelivery(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['deliveries'] });
      void client.invalidateQueries({ queryKey: ['orders'] });
      void client.invalidateQueries({ queryKey: ['carrier-deliveries'] });
    },
  });
}

/** Отменить доставку с причиной. */
export function useCancelDelivery() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelDelivery(id, reason),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['deliveries'] });
      void client.invalidateQueries({ queryKey: ['orders'] });
      void client.invalidateQueries({ queryKey: ['carrier-deliveries'] });
    },
  });
}
