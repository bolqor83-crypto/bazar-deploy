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
  Delivery,
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

/** Лента перевозчика (feed/mine). */
export function useCarrierDeliveries(scope: CarrierDeliveryScope) {
  return useQuery({
    queryKey: ['carrier-deliveries', scope],
    queryFn: () => fetchCarrierDeliveries({ scope, pageSize: 30 }),
  });
}

/** Детали доставки для перевозчика. */
export function useCarrierDelivery(id: string) {
  return useQuery({
    queryKey: ['deliveries', 'detail', id],
    queryFn: () => fetchCarrierDelivery(id),
    enabled: id.length > 0,
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
    onSuccess: (delivery: Delivery) => {
      client.setQueryData(['deliveries', 'detail', delivery.id], delivery);
      void client.invalidateQueries({ queryKey: ['orders'] });
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
    onSuccess: (delivery: Delivery) => {
      client.setQueryData(['deliveries', 'detail', delivery.id], delivery);
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
    onSuccess: (delivery: Delivery) => {
      client.setQueryData(['deliveries', 'detail', delivery.id], delivery);
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
    onSuccess: (delivery: Delivery) => {
      client.setQueryData(['deliveries', 'detail', delivery.id], delivery);
      void client.invalidateQueries({ queryKey: ['orders'] });
      void client.invalidateQueries({ queryKey: ['carrier-deliveries'] });
    },
  });
}
