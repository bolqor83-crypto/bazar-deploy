/**
 * Модель корзины (Промт 9, Часть D).
 *
 * Отражает контракты /api/cart: позиции с предложениями, итог
 * в копейках и предупреждения (товар исчез или склад уменьшился).
 * Контур корзины: '' (розница покупателя) или id организации
 * оптового контура — заголовок X-Organization-Id.
 */

/** Позиция корзины (клиентский вид). */
export interface CartItem {
  id: string;
  quantity: number;
  /** Цена × количество, копейки (по персональной цене, если
   * позиция добавлена по запросу — Промт 16, C). */
  subtotal: number;
  offer: {
    id: string;
    priceKopecks: number | null;
    /** Базовая цена скрыта (цена по запросу). */
    priceOnRequest: boolean;
    stock: number;
    minQuantity: number;
    badge: string | null;
    isPerishable: boolean;
    product: { id: string; name: string; unit: string };
    organization: { id: string; name: string };
  };
  /** Персональное предложение, по которому позиция в корзине
   * (Промт 16, C): цена строки = quote.priceKopecks. */
  quote?: {
    id: string;
    priceKopecks: number;
    /** Истёк ли срок (вычисляется на сервере при чтении). */
    expired: boolean;
    validUntil: string;
  } | null;
}

/** Предупреждение корзины: позиция требует внимания. */
export interface CartWarning {
  itemId: string;
  message: string;
}

/** Корзина контура (клиентский вид). */
export interface CartView {
  items: CartItem[];
  /** Сумма позиций, копейки. */
  subtotal: number;
  warnings: CartWarning[];
}
