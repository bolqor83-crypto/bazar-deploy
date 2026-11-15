/**
 * Помощник создания уведомлений о событиях заказа и доставки
 * (Промт 10, Части C–D).
 *
 * Функции (не сервисы): вызываются внутри транзакций сервисов с
 * их tx-клиентом — уведомление атомарно с основной записью
 * (статус/создание заказа/доставки).
 */
import type { Prisma, Notification } from '@prisma/client';

/** Типы уведомлений (колонка Notification.type). */
export const NOTIFICATION_TYPES = [
  'NEW_ORDER',
  'ORDER_STATUS',
  'ORDER_CANCELLED',
  'NEW_DELIVERY',
  'DELIVERY_STATUS',
  'DELIVERY_CANCELLED',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Человекочитаемые статусы заказа для текста уведомления. */
const STATUS_PHRASES: Record<string, string> = {
  CONFIRMED: 'подтверждён',
  PREPARING: 'собирается',
  READY: 'готов к выдаче',
  COMPLETED: 'завершён',
};

/** Человекочитаемые статусы доставки (Промт 10, Часть D). */
const DELIVERY_STATUS_PHRASES: Record<string, string> = {
  ACCEPTED: 'принята перевозчиком',
  PICKED_UP: 'забрана перевозчиком',
  IN_TRANSIT: 'в пути',
  DELIVERED: 'доставлена в точку назначения',
  COMPLETED: 'завершена',
  CANCELLED: 'отменена',
};

/** Контекст события заказа для уведомления. */
export interface NotifyOrderInput {
  /** Адресаты. */
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  orderId: string;
  orderNumber: string;
  /** Дополнительные поля payload (status, by). */
  extra?: Record<string, unknown>;
}

/** Создать уведомления адресатам внутри транзакции (createMany). */
export async function notifyOrderEvent(
  tx: Prisma.TransactionClient,
  input: NotifyOrderInput,
): Promise<void> {
  const uniqueIds = [...new Set(input.userIds)];
  if (uniqueIds.length === 0) return;
  await tx.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      payload: JSON.stringify({
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        ...input.extra,
      }),
      orderId: input.orderId,
    })),
  });
}

/** Текст статуса для уведомления покупателю. */
export function statusPhrase(status: string): string {
  return STATUS_PHRASES[status] ?? status.toLowerCase();
}

/** Текст статуса доставки для уведомления. */
export function deliveryStatusPhrase(status: string): string {
  return DELIVERY_STATUS_PHRASES[status] ?? status.toLowerCase();
}

/** Контекст события доставки для уведомления (Часть D). */
export interface NotifyDeliveryInput {
  /** Адресаты. */
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  deliveryId: string;
  deliveryNumber: string;
  /** Связанный заказ (для перехода из уведомления). */
  orderId: string;
  orderNumber: string;
  /** Дополнительные поля payload (status, by). */
  extra?: Record<string, unknown>;
}

/** Создать уведомления о событии доставки (createMany). */
export async function notifyDeliveryEvent(
  tx: Prisma.TransactionClient,
  input: NotifyDeliveryInput,
): Promise<void> {
  const uniqueIds = [...new Set(input.userIds)];
  if (uniqueIds.length === 0) return;
  await tx.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      payload: JSON.stringify({
        deliveryId: input.deliveryId,
        deliveryNumber: input.deliveryNumber,
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        ...input.extra,
      }),
      orderId: input.orderId,
    })),
  });
}

/** Сумма в рублях для текста уведомления. */
export function rubles(kopecks: number): string {
  return `${Math.round(kopecks / 100).toLocaleString('ru-RU')} ₽`;
}

/** Вид уведомления для API. */
export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  orderId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

/** Приведение записи к view (payload — безопасный разбор JSON). */
export function toNotificationView(row: Notification): NotificationView {
  let payload: Record<string, unknown> | null = null;
  if (row.payload) {
    try {
      const parsed: unknown = JSON.parse(row.payload);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        payload = parsed as Record<string, unknown>;
      }
    } catch {
      payload = null;
    }
  }
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    payload,
    orderId: row.orderId,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}
