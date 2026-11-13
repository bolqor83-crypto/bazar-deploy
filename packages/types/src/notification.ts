/**
 * Модель уведомлений (Промт 10, Часть C).
 *
 * In-app уведомления о событиях заказов: смена статуса продавцом
 * (адресат — покупатель), создание и отмена заказа покупателем
 * (адресаты — продавцы организации). payload — JSON-контекст
 * события (номер заказа, статус, инициатор).
 */

/** Типы уведомлений (значения колонки Notification.type). */
export const NOTIFICATION_TYPES = [
  'NEW_ORDER',
  'ORDER_STATUS',
  'ORDER_CANCELLED',
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
