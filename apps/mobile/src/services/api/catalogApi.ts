/**
 * Клиент каталога (Промт 8, Часть C): GET /api/catalog/*.
 *
 * Маршруты публичные, но запросы идут через apiRequest — с Bearer,
 * если сессия есть (единая точка выхода в сеть + таймаут 15 секунд).
 * Ошибки каталога маппятся в AuthError с кодом AUTH_UNKNOWN:
 * экран показывает своё сообщение (ErrorState + «Повторить»).
 */
import type {
  CatalogCategory,
  CatalogListParams,
  CatalogProductDetail,
  CatalogProductList,
} from '@bazar/types';
import { apiRequest } from './client';

/** Список категорий с числом товаров. */
export async function fetchCategories(): Promise<CatalogCategory[]> {
  return apiRequest<CatalogCategory[]>('/catalog/categories', {
    auth: false,
  });
}

/** Страница списка товаров. */
export async function fetchProducts(
  params: CatalogListParams,
): Promise<CatalogProductList> {
  const query = new URLSearchParams();
  if (params.category) {
    query.set('category', params.category);
  }
  if (params.q) {
    query.set('q', params.q);
  }
  if (params.sort) {
    query.set('sort', params.sort);
  }
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }
  if (params.minPrice !== undefined) {
    query.set('minPrice', String(params.minPrice));
  }
  if (params.maxPrice !== undefined) {
    query.set('maxPrice', String(params.maxPrice));
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiRequest<CatalogProductList>(`/catalog/products${suffix}`, {
    auth: false,
  });
}

/** Деталь товара с предложениями продавцов. */
export async function fetchProduct(id: string): Promise<CatalogProductDetail> {
  return apiRequest<CatalogProductDetail>(`/catalog/products/${id}`, {
    auth: false,
  });
}
