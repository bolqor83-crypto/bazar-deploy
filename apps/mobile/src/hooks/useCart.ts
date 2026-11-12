/**
 * Хуки корзины на TanStack Query (Промт 9, Часть D).
 *
 * Ключ ['cart', organizationId] — корзины контуров изолированы.
 * Мутации обновляют кэш напрямую (optimistic-ответ сервера уже
 * содержит новое состояние корзины).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CartView } from '@bazar/types';
import {
  addCartItem,
  clearCart,
  fetchCart,
  removeCartItem,
  updateCartItem,
} from '../services/api/cartApi';
import { useContextStore } from '../stores/contextStore';

/** Ключ кэша корзины активного контура. */
export function cartKey(): ['cart', string | null] {
  const org = useContextStore.getState().active.organizationId;
  return ['cart', org];
}

/** Корзина контура. */
export function useCart() {
  const organizationId = useContextStore(
    (state) => state.active.organizationId,
  );
  return useQuery({
    queryKey: ['cart', organizationId],
    queryFn: fetchCart,
  });
}

/** Добавить предложение (quantity >= minQuantity). */
export function useAddToCart() {
  const client = useQueryClient();
  const organizationId = useContextStore(
    (state) => state.active.organizationId,
  );
  return useMutation({
    mutationFn: ({
      offerId,
      quantity,
    }: {
      offerId: string;
      quantity: number;
    }) => addCartItem(offerId, quantity),
    onSuccess: (cart: CartView) => {
      client.setQueryData(['cart', organizationId], cart);
    },
  });
}

/** Изменить количество позиции. */
export function useUpdateCartItem() {
  const client = useQueryClient();
  const organizationId = useContextStore(
    (state) => state.active.organizationId,
  );
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onSuccess: (cart: CartView) => {
      client.setQueryData(['cart', organizationId], cart);
    },
  });
}

/** Удалить позицию. */
export function useRemoveCartItem() {
  const client = useQueryClient();
  const organizationId = useContextStore(
    (state) => state.active.organizationId,
  );
  return useMutation({
    mutationFn: (itemId: string) => removeCartItem(itemId),
    onSuccess: (cart: CartView) => {
      client.setQueryData(['cart', organizationId], cart);
    },
  });
}

/** Очистить корзину. */
export function useClearCart() {
  const client = useQueryClient();
  const organizationId = useContextStore(
    (state) => state.active.organizationId,
  );
  return useMutation({
    mutationFn: () => clearCart(),
    onSuccess: (cart: CartView) => {
      client.setQueryData(['cart', organizationId], cart);
    },
  });
}
