/**
 * Модель доставок (Промт 10, Часть D).
 *
 * Отражает контракты /api/deliveries и /api/carrier/deliveries.
 * Номер DL-YYYY-NNNNNN, статусы перевозки, события и участники.
 */

/** Статусы доставки. */
export const DELIVERY_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/** Человекочитаемые названия статусов доставки. */
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: 'Ожидает перевозчика',
  ACCEPTED: 'Принята',
  PICKED_UP: 'Забрана',
  IN_TRANSIT: 'В пути',
  DELIVERED: 'Доставлена',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
};

/** Событие жизненного цикла доставки. */
export interface DeliveryEvent {
  id: string;
  type: string;
  actorId?: string | null;
  createdAt: string;
}

/** Доставка (клиентский вид). */
export interface Delivery {
  id: string;
  number: string;
  orderId: string;
  orderNumber: string;
  requesterId: string;
  requesterName: string;
  carrierId: string | null;
  carrierName: string | null;
  status: DeliveryStatus;
  pickupAddress: string;
  pickupContact: string;
  dropoffAddress: string;
  dropoffContact: string;
  weightKg: number | null;
  volumeL: number | null;
  cargoNotes: string | null;
  price: number | null;
  createdAt: string;
  updatedAt: string;
  events: DeliveryEvent[];
}

/** Страница списка доставок. */
export interface DeliveryList {
  items: Delivery[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Ввод создания заявки на доставку. */
export interface CreateDeliveryInput {
  orderId: string;
  pickupAddress: string;
  pickupContact: string;
  dropoffAddress: string;
  dropoffContact: string;
  weightKg?: number;
  volumeL?: number;
  cargoNotes?: string;
}

/** Краткий вид доставки для карточки заказа (Промт 10, D). */
export interface DeliveryBrief {
  id: string;
  number: string;
  status: DeliveryStatus;
  carrierName: string | null;
  dropoffAddress: string;
  price: number | null;
}

/** Действия перевозчика по доставке (Часть D). */
export const CARRIER_DELIVERY_ACTIONS = [
  'accept',
  'picked-up',
  'in-transit',
  'delivered',
] as const;
export type CarrierDeliveryAction = (typeof CARRIER_DELIVERY_ACTIONS)[number];

/** Сегмент ленты перевозчика. */
export const CARRIER_DELIVERY_SCOPES = ['feed', 'mine'] as const;
export type CarrierDeliveryScope = (typeof CARRIER_DELIVERY_SCOPES)[number];
