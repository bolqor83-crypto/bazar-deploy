/**
 * Модель уведомлений (Промт 10, Части C–D).
 *
 * In-app уведомления о событиях заказов и доставок: смена статуса
 * продавцом (адресат — покупатель), создание и отмена заказа
 * покупателем (адресаты — продавцы организации), события доставки
 * (принятие, статусы рейса, отмена — адресатам-участникам).
 * payload — JSON-контекст события (номера, статус, инициатор).
 */

/** Типы уведомлений (значения колонки Notification.type). */
export const NOTIFICATION_TYPES = [
  'NEW_ORDER',
  'ORDER_STATUS',
  'ORDER_CANCELLED',
  'NEW_DELIVERY',
  'DELIVERY_STATUS',
  'DELIVERY_CANCELLED',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Уведомление (клиентский вид). */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** JSON-контекст события: { orderId, orderNumber, status? }. */
  payload?: Record<string, unknown> | null;
  orderId?: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Страница списка уведомлений. */
export interface NotificationList {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  unread: number;
}
