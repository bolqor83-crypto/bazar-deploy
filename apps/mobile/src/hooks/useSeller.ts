/**
 * Хуки кабинета продавца на TanStack Query (Промт 10, Часть B).
 *
 * Ключ ['seller', ...] — инвалидация после мутаций. Списки
 * товаров/предложений обновляются по организации контекста.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateSellerOfferInput,
  CreateSellerProductInput,
  SellerOffer,
  SellerProduct,
  UpdateSellerOfferInput,
  UpdateSellerProductInput,
} from '@bazar/types';
import {
  archiveSellerProduct,
  createSellerOffer,
  createSellerProduct,
  deleteSellerOffer,
  fetchSellerCategories,
  fetchSellerOffer,
  fetchSellerOffers,
  fetchSellerProducts,
  updateSellerOffer,
  updateSellerProduct,
} from '../services/api/sellerApi';

/** Товары организации (active/archived). */
export function useSellerProducts(archived = false) {
  return useQuery({
    queryKey: ['seller', 'products', archived],
    queryFn: () => fetchSellerProducts({ archived }),
  });
}

/** Категории для формы товара. */
export function useSellerCategories() {
  return useQuery({
    queryKey: ['seller', 'categories'],
    queryFn: fetchSellerCategories,
    staleTime: 5 * 60 * 1000,
  });
}

/** Предложения организации. */
export function useSellerOffers(options: {
  archived?: boolean;
  search?: string;
}) {
  return useQuery({
    queryKey: [
      'seller',
      'offers',
      options.archived ?? false,
      options.search ?? '',
    ],
    queryFn: () => fetchSellerOffers(options),
  });
}

/** Детали предложения. */
export function useSellerOffer(id: string) {
  return useQuery({
    queryKey: ['seller', 'offers', 'detail', id],
    queryFn: () => fetchSellerOffer(id),
    enabled: id.length > 0,
  });
}

/** Создать товар. */
export function useCreateSellerProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSellerProductInput) =>
      createSellerProduct(input),
    onSuccess: (product: SellerProduct) => {
      void client.invalidateQueries({ queryKey: ['seller', 'products'] });
      return product;
    },
  });
}

/** Обновить товар. */
export function useUpdateSellerProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSellerProductInput }) =>
      updateSellerProduct(id, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['seller', 'products'] });
    },
  });
}

/** Архивировать товар. */
export function useArchiveSellerProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveSellerProduct(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['seller', 'products'] });
    },
  });
}

/** Создать предложение. */
export function useCreateSellerOffer() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSellerOfferInput) => createSellerOffer(input),
    onSuccess: (offer: SellerOffer) => {
      void client.invalidateQueries({ queryKey: ['seller', 'offers'] });
      void client.invalidateQueries({ queryKey: ['seller', 'products'] });
      return offer;
    },
  });
}

/** Обновить предложение. */
export function useUpdateSellerOffer() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSellerOfferInput }) =>
      updateSellerOffer(id, input),
    onSuccess: (offer: SellerOffer) => {
      client.setQueryData(['seller', 'offers', 'detail', offer.id], offer);
      void client.invalidateQueries({ queryKey: ['seller', 'offers'] });
    },
  });
}

/** Удалить/архивировать предложение. */
export function useDeleteSellerOffer() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSellerOffer(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['seller', 'offers'] });
    },
  });
}
