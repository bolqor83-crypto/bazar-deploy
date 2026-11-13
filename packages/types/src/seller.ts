/**
 * Модель кабинета продавца (Промт 10, Часть B/C).
 *
 * Отражает контракты /api/seller/products и /api/seller/offers:
 * товар с мягким удалением (archivedAt), предложение с историей
 * цены и журналом склада. Цены — копейки.
 */

/** Товар в кабинете продавца. */
export interface SellerProduct {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  unit: string;
  images: string[];
  archivedAt: string | null;
  offersCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Ввод создания товара. */
export interface CreateSellerProductInput {
  title: string;
  subtitle?: string;
  description?: string;
  categoryId: string;
  unit: string;
}

/** Ввод обновления товара. */
export interface UpdateSellerProductInput {
  title?: string;
  subtitle?: string;
  description?: string;
  categoryId?: string;
  unit?: string;
}

/** Запись истории цены предложения. */
export interface OfferPriceHistoryEntry {
  price: number;
  createdAt: string;
}

/** Запись журнала изменения склада. */
export interface StockChangeEntry {
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
}

/** Предложение (партия) в кабинете продавца. */
export interface SellerOffer {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    subtitle: string | null;
    unit: string;
    images: string;
    archivedAt: string | null;
  };
  price: number;
  stock: number;
  minQuantity: number;
  badge: string | null;
  isPerishable: boolean;
  archivedAt: string | null;
  priceHistory: OfferPriceHistoryEntry[];
  stockChanges: StockChangeEntry[];
  createdAt: string;
  updatedAt: string;
}

/** Ввод создания предложения. */
export interface CreateSellerOfferInput {
  productId: string;
  price: number;
  stock: number;
  minQuantity?: number;
  badge?: string;
  isPerishable?: boolean;
  images?: string[];
}

/** Ввод обновления предложения. */
export interface UpdateSellerOfferInput {
  price?: number;
  stock?: number;
  stockReason?: string;
  minQuantity?: number;
  badge?: string;
  isPerishable?: boolean;
  images?: string[];
}

/** Страница списка предложений. */
export interface SellerOfferList {
  items: SellerOffer[];
  total: number;
  page: number;
  pageSize: number;
}

/** Ответ presign /api/uploads/presign. */
export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresAt: string;
}
