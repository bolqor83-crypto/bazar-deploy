/**
 * Клиент уведомлений (Промт 10, Часть C): /api/notifications.
 */
import type { Notification, NotificationList } from '@bazar/types';
import { apiRequest } from './client';

/** Список уведомлений (пагинация, только непрочитанные). */
export async function fetchNotifications(params: {
  page?: number;
  pageSize?: number;
  unread?: boolean;
}): Promise<NotificationList> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.unread) query.set('unread', 'true');
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiRequest<NotificationList>(`/notifications${suffix}`, {
    auth: true,
  });
}

/** Количество непрочитанных. */
export async function fetchUnreadCount(): Promise<number> {
  const result = await apiRequest<{ unread: number }>(
    '/notifications/unread-count',
    { auth: true },
  );
  return result.unread;
}

/** Отметить одно уведомление прочитанным. */
export async function markNotificationRead(id: string): Promise<Notification> {
  return apiRequest<Notification>(`/notifications/${id}/read`, {
    method: 'POST',
    auth: true,
  });
}

/** Отметить все прочитанными. */
export async function markAllNotificationsRead(): Promise<{
  updated: number;
}> {
  return apiRequest<{ updated: number }>('/notifications/read-all', {
    method: 'POST',
    auth: true,
  });
}
