/**
 * Хуки уведомлений на TanStack Query (Промт 10, Часть C).
 *
 * Отметка о прочтении обновляет и список, и счётчик непрочитанных.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/api/notificationApi';

/** Список уведомлений. */
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => fetchNotifications({ pageSize: 50 }),
  });
}

/** Счётчик непрочитанных (бейдж). Обновляется при инвалидации
 *  после отметок о прочтении; периодический опрос не нужен. */
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    staleTime: 15_000,
  });
}

/** Отметить одно прочитанным. */
export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** Отметить все прочитанными. */
export function useMarkAllNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
