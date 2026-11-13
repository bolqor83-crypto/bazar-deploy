/**
 * Тесты api-клиентов Части C Промта 10: заказы продавца
 * (список/деталь/действия) и уведомления (список/счётчик/прочтение).
 * Мок apiRequest — проверяем параметры вызовов.
 */
import * as client from '../client';
import {
  fetchSellerOrder,
  fetchSellerOrders,
  postSellerOrderAction,
} from '../sellerApi';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../notificationApi';

jest.mock('../client', () => ({
  apiRequest: jest.fn(),
}));

jest.mock('../../../stores/contextStore', () => ({
  useContextStore: {
    getState: () => ({ active: { organizationId: 'org-1' } }),
  },
}));

const apiRequestMock = jest.mocked(client.apiRequest);

describe('sellerApi: заказы (Часть C)', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it('fetchSellerOrders: статусы через запятую и поиск', async () => {
    apiRequestMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      hasMore: false,
    });
    await fetchSellerOrders({
      statuses: ['CONFIRMED', 'PREPARING'],
      search: 'BZ-2026',
      page: 2,
    });
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/seller/orders?status=CONFIRMED%2CPREPARING&search=BZ-2026&page=2',
      {
        auth: true,
        headers: { 'X-Organization-Id': 'org-1' },
      },
    );
  });

  it('fetchSellerOrders: без фильтров — чистый путь', async () => {
    apiRequestMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      hasMore: false,
    });
    await fetchSellerOrders({});
    expect(apiRequestMock).toHaveBeenCalledWith('/seller/orders', {
      auth: true,
      headers: { 'X-Organization-Id': 'org-1' },
    });
  });

  it('fetchSellerOrder: деталь по id', async () => {
    apiRequestMock.mockResolvedValue({ id: 'o1' });
    await fetchSellerOrder('o1');
    expect(apiRequestMock).toHaveBeenCalledWith('/seller/orders/o1', {
      auth: true,
      headers: { 'X-Organization-Id': 'org-1' },
    });
  });

  it.each(['confirm', 'preparing', 'ready', 'complete', 'cancel'] as const)(
    'postSellerOrderAction: POST /seller/orders/:id/%s',
    async (action) => {
      apiRequestMock.mockResolvedValue({ id: 'o1' });
      await postSellerOrderAction('o1', action);
      expect(apiRequestMock).toHaveBeenCalledWith(
        `/seller/orders/o1/${action}`,
        {
          method: 'POST',
          auth: true,
          headers: { 'X-Organization-Id': 'org-1' },
        },
      );
    },
  );
});

describe('notificationApi', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it('fetchNotifications: query из фильтров', async () => {
    apiRequestMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      hasMore: false,
      unread: 0,
    });
    await fetchNotifications({ page: 1, unread: true });
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/notifications?page=1&unread=true',
      { auth: true },
    );
  });

  it('fetchUnreadCount: разворачивает объект в число', async () => {
    apiRequestMock.mockResolvedValue({ unread: 7 });
    const result = await fetchUnreadCount();
    expect(result).toBe(7);
    expect(apiRequestMock).toHaveBeenCalledWith('/notifications/unread-count', {
      auth: true,
    });
  });

  it('markNotificationRead: POST по id', async () => {
    apiRequestMock.mockResolvedValue({ id: 'n1', readAt: '2026-11-13' });
    await markNotificationRead('n1');
    expect(apiRequestMock).toHaveBeenCalledWith('/notifications/n1/read', {
      method: 'POST',
      auth: true,
    });
  });

  it('markAllNotificationsRead: POST read-all', async () => {
    apiRequestMock.mockResolvedValue({ updated: 3 });
    const result = await markAllNotificationsRead();
    expect(result.updated).toBe(3);
    expect(apiRequestMock).toHaveBeenCalledWith('/notifications/read-all', {
      method: 'POST',
      auth: true,
    });
  });
});
