/**
 * Клиент корзины (Промт 9, Часть D): /api/cart.
 *
 * Контур — заголовок X-Organization-Id из активного контекста
 * (customer — без заголовка, розничная корзина).
 */
import type { CartView } from '@bazar/types';
import { apiRequest } from './client';
import { useContextStore } from '../../stores/contextStore';

/** Заголовок контура для запроса. */
function scopeHeaders(): Record<string, string> {
  const org = useContextStore.getState().active.organizationId;
  return org ? { 'X-Organization-Id': org } : {};
}

/** Корзина контура: позиции, итог, warnings. */
export async function fetchCart(): Promise<CartView> {
  return apiRequest<CartView>('/cart', {
    auth: true,
    headers: scopeHeaders(),
  });
}

/** Добавить предложение (quantity >= minQuantity). */
export async function addCartItem(
  offerId: string,
  quantity: number,
): Promise<CartView> {
  return apiRequest<CartView>('/cart/items', {
    method: 'POST',
    auth: true,
    headers: scopeHeaders(),
    body: { offerId, quantity },
  });
}

/** Изменить количество позиции. */
export async function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<CartView> {
  return apiRequest<CartView>(`/cart/items/${itemId}`, {
    method: 'PATCH',
    auth: true,
    headers: scopeHeaders(),
    body: { quantity },
  });
}

/** Удалить позицию. */
export async function removeCartItem(itemId: string): Promise<CartView> {
  return apiRequest<CartView>(`/cart/items/${itemId}`, {
    method: 'DELETE',
    auth: true,
    headers: scopeHeaders(),
  });
}

/** Очистить корзину контура. */
export async function clearCart(): Promise<CartView> {
  return apiRequest<CartView>('/cart', {
    method: 'DELETE',
    auth: true,
    headers: scopeHeaders(),
  });
}
