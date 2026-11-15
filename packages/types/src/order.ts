/**
 * Модель заказов (Промт 9, Часть E).
 *
 * Отражает контракты /api/orders: заказ с позициями-снапшотами и
 * событиями жизненного цикла. Статусы — строки (в БД без enum,
 * значения валидируются DTO). Цены — копейки.
 */
import type { DeliveryBrief } from './delivery';

/** Статусы заказа. */
export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Способы получения. */
export const ORDER_DELIVERY_METHODS = ['pickup', 'delivery'] as const;
export type OrderDeliveryMethod = (typeof ORDER_DELIVERY_METHODS)[number];

/** Позиция заказа — снапшот предложения на момент покупки. */
export interface OrderItem {
  id: string;
  offerId: string;
  title: string;
  unit: string;
  /** Цена за единицу на момент покупки, копейки. */
  price: number;
  quantity: number;
  total: number;
}

/** Событие жизненного цикла заказа. */
export interface OrderEvent {
  id: string;
  type:
    | 'CREATED'
    | 'CONFIRMED'
    | 'PREPARING'
    | 'READY'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'STATUS_CHANGED';
  createdAt: string;
}

/** Заказ (клиентский вид). */
export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  subtotal: number;
  deliveryCost: number;
  total: number;
  address: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  seller: { id: string; name: string };
  items: OrderItem[];
  events: OrderEvent[];
  /** Активная доставка заказа (Промт 10, Часть D). */
  delivery: DeliveryBrief | null;
}

/** Страница списка заказов. */
export interface OrderList {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Параметры создания заказа. */
export interface CreateOrderInput {
  items: { offerId: string; quantity: number }[];
  address?: string;
  comment?: string;
  deliveryMethod: OrderDeliveryMethod;
}

/** Заказ в кабинете продавца: заказ + карточка покупателя. */
export interface SellerOrder extends Order {
  buyer: { id: string; name: string; phone: string };
}

/** Страница списка заказов продавца. */
export interface SellerOrderList {
  items: SellerOrder[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Действия продавца по заказу (Промт 10, Часть C). */
export const SELLER_ORDER_ACTIONS = [
  'confirm',
  'preparing',
  'ready',
  'complete',
  'cancel',
] as const;
export type SellerOrderAction = (typeof SELLER_ORDER_ACTIONS)[number];
