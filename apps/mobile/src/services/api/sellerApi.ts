/**
 * Клиент кабинета продавца (Промт 10, Часть B/C):
 * /api/seller/products и /api/seller/offers.
 *
 * Заголовок X-Organization-Id — активная организация контекста
 * (guard на сервере проверит membership WHOLESALE_SELLER).
 */
import type {
  CreateSellerOfferInput,
  CreateSellerProductInput,
  SellerOffer,
  SellerOfferList,
  SellerProduct,
  UpdateSellerOfferInput,
  UpdateSellerProductInput,
} from '@bazar/types';
import { apiRequest } from './client';
import { useContextStore } from '../../stores/contextStore';

/** Заголовок организации продавца. */
function sellerHeaders(): Record<string, string> {
  const org = useContextStore.getState().active.organizationId;
  return org ? { 'X-Organization-Id': org } : {};
}

/** Товары организации (active/archived). */
export async function fetchSellerProducts(options: {
  archived?: boolean;
}): Promise<SellerProduct[]> {
  const query = options.archived ? '?archived=true' : '';
  return apiRequest<SellerProduct[]>(`/seller/products${query}`, {
    auth: true,
    headers: sellerHeaders(),
  });
}

/** Создать товар. */
export async function createSellerProduct(
  input: CreateSellerProductInput,
): Promise<SellerProduct> {
  return apiRequest<SellerProduct>('/seller/products', {
    method: 'POST',
    auth: true,
    headers: sellerHeaders(),
    body: input,
  });
}

/** Обновить товар. */
export async function updateSellerProduct(
  id: string,
  input: UpdateSellerProductInput,
): Promise<SellerProduct> {
  return apiRequest<SellerProduct>(`/seller/products/${id}`, {
    method: 'PATCH',
    auth: true,
    headers: sellerHeaders(),
    body: input,
  });
}

/** Архивировать товар (soft-delete). */
export async function archiveSellerProduct(
  id: string,
): Promise<SellerProduct> {
  return apiRequest<SellerProduct>(`/seller/products/${id}`, {
    method: 'DELETE',
    auth: true,
    headers: sellerHeaders(),
  });
}

/** Предложения организации (сегмент, поиск, пагинация). */
export async function fetchSellerOffers(options: {
  archived?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<SellerOfferList> {
  const query = new URLSearchParams();
  if (options.archived) query.set('archived', 'true');
  if (options.search) query.set('search', options.search);
  if (options.page) query.set('page', String(options.page));
  if (options.pageSize) query.set('pageSize', String(options.pageSize));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiRequest<SellerOfferList>(`/seller/offers${suffix}`, {
    auth: true,
    headers: sellerHeaders(),
  });
}

/** Детали предложения с историей. */
export async function fetchSellerOffer(id: string): Promise<SellerOffer> {
  return apiRequest<SellerOffer>(`/seller/offers/${id}`, {
    auth: true,
    headers: sellerHeaders(),
  });
}

/** Создать предложение (партию). */
export async function createSellerOffer(
  input: CreateSellerOfferInput,
): Promise<SellerOffer> {
  return apiRequest<SellerOffer>('/seller/offers', {
    method: 'POST',
    auth: true,
    headers: sellerHeaders(),
    body: input,
  });
}

/** Обновить предложение. */
export async function updateSellerOffer(
  id: string,
  input: UpdateSellerOfferInput,
): Promise<SellerOffer> {
  return apiRequest<SellerOffer>(`/seller/offers/${id}`, {
    method: 'PATCH',
    auth: true,
    headers: sellerHeaders(),
    body: input,
  });
}

/** Удалить/архивировать предложение. */
export async function deleteSellerOffer(
  id: string,
): Promise<{ archived: boolean }> {
  return apiRequest<{ archived: boolean }>(`/seller/offers/${id}`, {
    method: 'DELETE',
    auth: true,
    headers: sellerHeaders(),
  });
}

/** Категории каталога для формы товара. */
export async function fetchSellerCategories(): Promise<
  { id: string; name: string; slug: string }[]
> {
  const result = await apiRequest<{
    items: { id: string; name: string; slug: string }[];
  }>('/catalog/categories', { auth: true });
  return result.items;
}
