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
  /** Цена × количество, копейки. */
  subtotal: number;
  offer: {
    id: string;
    priceKopecks: number;
    stock: number;
    minQuantity: number;
    badge: string | null;
    isPerishable: boolean;
    product: { id: string; name: string; unit: string };
    organization: { id: string; name: string };
  };
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
