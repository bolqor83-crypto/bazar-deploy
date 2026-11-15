/**
 * Тесты deliveryApi (Промт 10, Часть D): создание заявки,
 * детали, завершение, отмена, лента перевозчика и действия
 * по рейсу. Мок apiRequest — проверяем параметры.
 */
import * as client from '../client';
import {
  cancelDelivery,
  completeDelivery,
  createDelivery,
  fetchCarrierDeliveries,
  fetchCarrierDelivery,
  fetchDelivery,
  postCarrierDeliveryAction,
} from '../deliveryApi';

jest.mock('../client', () => ({
  apiRequest: jest.fn(),
}));

jest.mock('../../../stores/contextStore', () => ({
  useContextStore: {
    getState: () => ({ active: { organizationId: 'org-carrier' } }),
  },
}));

const apiRequestMock = jest.mocked(client.apiRequest);

const delivery = {
  id: 'd1',
  number: 'DL-2026-000001',
  orderId: 'o1',
  orderNumber: 'BZ-2026-000001',
  requesterId: 'u1',
  requesterName: 'Мария',
  carrierId: null,
  carrierName: null,
  status: 'PENDING' as const,
  pickupAddress: 'База, ул. Шоссейная, 4',
  pickupContact: 'Пётр',
  dropoffAddress: 'ул. Большая Садовая, 101',
  dropoffContact: 'Мария',
  weightKg: 60,
  volumeL: 400,
  cargoNotes: null,
  price: null,
  cancelReason: null,
  createdAt: '2026-11-15T08:00:00Z',
  updatedAt: '2026-11-15T08:00:00Z',
  events: [],
};

describe('deliveryApi', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it('createDelivery: POST /deliveries с адресами', async () => {
    apiRequestMock.mockResolvedValue(delivery);
    const result = await createDelivery({
      orderId: 'o1',
      pickupAddress: 'База, ул. Шоссейная, 4',
      pickupContact: 'Пётр',
      dropoffAddress: 'ул. Большая Садовая, 101',
      dropoffContact: 'Мария',
      weightKg: 60,
    });
    expect(apiRequestMock).toHaveBeenCalledWith('/deliveries', {
      method: 'POST',
      auth: true,
      body: expect.objectContaining({ orderId: 'o1', weightKg: 60 }),
    });
    expect(result.number).toBe('DL-2026-000001');
  });

  it('fetchDelivery: GET /deliveries/:id участником', async () => {
    apiRequestMock.mockResolvedValue(delivery);
    await fetchDelivery('d1');
    expect(apiRequestMock).toHaveBeenCalledWith('/deliveries/d1', {
      auth: true,
    });
  });

  it('completeDelivery: POST complete без тела', async () => {
    apiRequestMock.mockResolvedValue(delivery);
    await completeDelivery('d1');
    expect(apiRequestMock).toHaveBeenCalledWith('/deliveries/d1/complete', {
      method: 'POST',
      auth: true,
    });
  });

  it('cancelDelivery: POST cancel с причиной', async () => {
    apiRequestMock.mockResolvedValue(delivery);
    await cancelDelivery('d1', 'Машина сломалась');
    expect(apiRequestMock).toHaveBeenCalledWith('/deliveries/d1/cancel', {
      method: 'POST',
      auth: true,
      body: { reason: 'Машина сломалась' },
    });
  });

  it('fetchCarrierDeliveries: scope в query, заголовок организации', async () => {
    apiRequestMock.mockResolvedValue({
      items: [delivery],
      total: 1,
      page: 1,
      pageSize: 30,
      hasMore: false,
    });
    await fetchCarrierDeliveries({ scope: 'feed' });
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/carrier/deliveries?scope=feed',
      {
        auth: true,
        headers: { 'X-Organization-Id': 'org-carrier' },
      },
    );
  });

  it('fetchCarrierDelivery: детали с заголовком организации', async () => {
    apiRequestMock.mockResolvedValue(delivery);
    await fetchCarrierDelivery('d1');
    expect(apiRequestMock).toHaveBeenCalledWith('/carrier/deliveries/d1', {
      auth: true,
      headers: { 'X-Organization-Id': 'org-carrier' },
    });
  });

  it('postCarrierDeliveryAction: accept со ставкой передаёт price', async () => {
    apiRequestMock.mockResolvedValue(delivery);
    await postCarrierDeliveryAction('d1', 'accept', 15000);
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/carrier/deliveries/d1/accept',
      {
        method: 'POST',
        auth: true,
        headers: { 'X-Organization-Id': 'org-carrier' },
        body: { price: 15000 },
      },
    );
  });

  it('postCarrierDeliveryAction: picked-up без тела', async () => {
    apiRequestMock.mockResolvedValue(delivery);
    await postCarrierDeliveryAction('d1', 'picked-up');
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/carrier/deliveries/d1/picked-up',
      {
        method: 'POST',
        auth: true,
        headers: { 'X-Organization-Id': 'org-carrier' },
        body: undefined,
      },
    );
  });
});
