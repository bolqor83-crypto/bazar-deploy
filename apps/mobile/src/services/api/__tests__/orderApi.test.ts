/**
 * Тесты orderApi (Промт 9, Часть E): создание, список с фильтром,
 * деталь, отмена. Мок apiRequest — проверяем параметры.
 */
import * as client from '../client';
import { cancelOrder, createOrder, fetchOrder, fetchOrders } from '../orderApi';

jest.mock('../client', () => ({
  apiRequest: jest.fn(),
}));

jest.mock('../../../stores/contextStore', () => ({
  useContextStore: {
    getState: () => ({ active: { organizationId: null } }),
  },
}));

const apiRequestMock = jest.mocked(client.apiRequest);
const order = {
  id: 'o1',
  number: 'BZ-2026-000001',
  status: 'PENDING',
  subtotal: 189000,
  deliveryCost: 0,
  total: 189000,
  address: null,
  comment: null,
  createdAt: '2026-11-12T08:00:00Z',
  updatedAt: '2026-11-12T08:00:00Z',
  seller: { id: 's1', name: 'Опт-Юг' },
  items: [],
  events: [],
};

describe('orderApi', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it('createOrder: POST /orders с позициями и самовывозом', async () => {
    apiRequestMock.mockResolvedValue([order]);
    const result = await createOrder({
      items: [{ offerId: 'offer-1', quantity: 10 }],
      deliveryMethod: 'pickup',
    });
    expect(apiRequestMock).toHaveBeenCalledWith('/orders', {
      method: 'POST',
      auth: true,
      headers: {},
      body: {
        items: [{ offerId: 'offer-1', quantity: 10 }],
        deliveryMethod: 'pickup',
      },
    });
    expect(result).toHaveLength(1);
  });

  it('fetchOrders: фильтр статуса собирается в query', async () => {
    apiRequestMock.mockResolvedValue({
      items: [order],
      total: 1,
      page: 1,
      pageSize: 10,
      hasMore: false,
    });
    await fetchOrders({ status: 'PENDING' });
    expect(apiRequestMock).toHaveBeenCalledWith('/orders?status=PENDING', {
      auth: true,
    });
  });

  it('fetchOrder: GET /orders/:id', async () => {
    apiRequestMock.mockResolvedValue(order);
    const result = await fetchOrder('o1');
    expect(apiRequestMock).toHaveBeenCalledWith('/orders/o1', { auth: true });
    expect(result.number).toBe('BZ-2026-000001');
  });

  it('cancelOrder: POST /orders/:id/cancel', async () => {
    apiRequestMock.mockResolvedValue({ ...order, status: 'CANCELLED' });
    const result = await cancelOrder('o1');
    expect(apiRequestMock).toHaveBeenCalledWith('/orders/o1/cancel', {
      method: 'POST',
      auth: true,
    });
    expect(result.status).toBe('CANCELLED');
  });
});
