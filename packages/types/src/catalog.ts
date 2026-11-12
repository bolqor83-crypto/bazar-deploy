/**
 * Модель каталога (Промт 8, Часть C).
 *
 * Отражает контракты GET /api/catalog/*: категории, список товаров
 * с лучшим предложением, деталь товара с предложениями продавцов.
 * Цены — копейки (priceKopecks), как во всей доменной модели.
 * См. ADR 0009.
 */

/** Категория каталога. */
export interface CatalogCategory {
  id: string;
  slug: string;
  name: string;
  /** Имя иконки из набора Lucide (Carrot, Apple, …). */
  icon: string;
  productCount: number;
}

/** Предложение продавца на товар. */
export interface CatalogOffer {
  id: string;
  priceKopecks: number;
  stock: number;
  minQuantity: number;
  /** «hit» — хит продаж; расширяется без миграций. */
  badge: string | null;
  isPerishable: boolean;
  organization: { id: string; name: string };
}

/** Товар в списке (сетка каталога). */
export interface CatalogProduct {
  id: string;
  name: string;
  unit: string;
  description: string;
  category: { slug: string; name: string };
  images: string[];
  /** Самое дешёвое предложение (может не быть). */
  bestOffer: CatalogOffer | null;
  offersCount: number;
}

/** Страница списка товаров. */
export interface CatalogProductList {
  items: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Деталь товара: то же, что в списке, плюс все предложения. */
export interface CatalogProductDetail {
  id: string;
  name: string;
  unit: string;
  description: string;
  category: { slug: string; name: string };
  images: string[];
  /** Отсортированы по цене по возрастанию. */
  offers: CatalogOffer[];
}

/** Способы сортировки (совпадают с API и SortPicker). */
export type CatalogSort = 'popular' | 'price-asc' | 'price-desc' | 'name';

/** Параметры запроса списка товаров. */
export interface CatalogListParams {
  category?: string;
  q?: string;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
  /** Цены фильтра — целые рубли (API сравнит с копейками). */
  minPrice?: number;
  maxPrice?: number;
}
