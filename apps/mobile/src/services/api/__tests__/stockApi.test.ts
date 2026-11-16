/**
 * Тесты stockApi (Промт 11b): склады, остатки, журнал, движения,
 * перемещение. Мок apiRequest — проверяем пути, методы и заголовки
 * организации (X-Organization-Id как в sellerApi).
 */
import * as client from '../client';
import {
  createStockLocation,
  createStockMovement,
  deleteStockLocation,
  fetchStockBalances,
  fetchStockLocations,
  fetchStockMovements,
  fetchStockSummary,
  transferStock,
  updateStockLocation,
} from '../stockApi';
import type { StockMovementResult } from '../stockApi';

jest.mock('../client', () => ({
  apiRequest: jest.fn(),
}));

jest.mock('../../../stores/contextStore', () => ({
  useContextStore: {
    getState: () => ({ active: { organizationId: 'org-1' } }),
  },
}));

const apiRequestMock = jest.mocked(client.apiRequest);

describe('stockApi', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it('fetchStockLocations: GET с заголовком организации', async () => {
    apiRequestMock.mockResolvedValue([]);
    await fetchStockLocations();
    expect(apiRequestMock).toHaveBeenCalledWith('/stock/locations', {
      auth: true,
      headers: { 'X-Organization-Id': 'org-1' },
    });
  });

  it('createStockLocation: POST с телом', async () => {
    apiRequestMock.mockResolvedValue({ id: 'l1' });
    await createStockLocation({
      name: 'Основной склад',
      type: 'WAREHOUSE',
    });
    expect(apiRequestMock).toHaveBeenCalledWith('/stock/locations', {
      method: 'POST',
      auth: true,
      headers: { 'X-Organization-Id': 'org-1' },
      body: { name: 'Основной склад', type: 'WAREHOUSE' },
    });
  });

  it('updateStockLocation: PATCH по id', async () => {
    apiRequestMock.mockResolvedValue({ id: 'l1' });
    await updateStockLocation('l1', { name: 'Склад №2' });
    expect(apiRequestMock).toHaveBeenCalledWith('/stock/locations/l1', {
      method: 'PATCH',
      auth: true,
      headers: { 'X-Organization-Id': 'org-1' },
      body: { name: 'Склад №2' },
    });
  });

  it('deleteStockLocation: DELETE по id', async () => {
    apiRequestMock.mockResolvedValue({ deleted: true });
    await deleteStockLocation('l1');
    expect(apiRequestMock).toHaveBeenCalledWith('/stock/locations/l1', {
      method: 'DELETE',
      auth: true,
      headers: { 'X-Organization-Id': 'org-1' },
    });
  });

  it('fetchStockBalances: фильтры склада и оффера в query', async () => {
    apiRequestMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      hasMore: false,
    });
    await fetchStockBalances({ locationId: 'l1', offerId: 'o1', pageSize: 50 });
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/stock/balances?locationId=l1&offerId=o1&pageSize=50',
      { auth: true, headers: { 'X-Organization-Id': 'org-1' } },
    );
  });

  it('fetchStockBalances: без фильтров — путь без query', async () => {
    apiRequestMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    await fetchStockBalances({});
    expect(apiRequestMock).toHaveBeenCalledWith('/stock/balances', {
      auth: true,
      headers: { 'X-Organization-Id': 'org-1' },
    });
  });

  it('fetchStockSummary: offerId кодируется в query', async () => {
    apiRequestMock.mockResolvedValue({
      offerId: 'o1',
      physicalQty: 10,
      reservedQty: 0,
      availableQty: 10,
      locationsCount: 1,
    });
    await fetchStockSummary('o 1');
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/stock/summary?offerId=o%201',
      expect.anything(),
    );
  });

  it('fetchStockMovements: все фильтры собираются в query', async () => {
    apiRequestMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      pageSize: 20,
      hasMore: false,
    });
    await fetchStockMovements({
      offerId: 'o1',
      locationId: 'l1',
      type: 'RECEIPT',
      from: 1763000000,
      page: 2,
    });
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/stock/movements?offerId=o1&locationId=l1&type=RECEIPT&from=1763000000&page=2',
      expect.anything(),
    );
  });

  it('createStockMovement: POST /stock/movements', async () => {
    apiRequestMock.mockResolvedValue({
      balance: { offerId: 'o1', locationId: 'l1' },
      totals: { physicalQty: 150 },
    });
    await createStockMovement({
      offerId: 'o1',
      locationId: 'l1',
      type: 'RECEIPT',
      quantity: 50,
      reason: 'Закупка у фермера',
    });
    expect(apiRequestMock).toHaveBeenCalledWith('/stock/movements', {
      method: 'POST',
      auth: true,
      headers: { 'X-Organization-Id': 'org-1' },
      body: {
        offerId: 'o1',
        locationId: 'l1',
        type: 'RECEIPT',
        quantity: 50,
        reason: 'Закупка у фермера',
      },
    });
  });

  it('transferStock: POST /stock/transfer', async () => {
    apiRequestMock.mockResolvedValue({ items: [] });
    await transferStock({
      offerId: 'o1',
      fromLocationId: 'l1',
      toLocationId: 'l2',
      quantity: 30,
      reason: 'Развоз по точке',
    });
    expect(apiRequestMock).toHaveBeenCalledWith('/stock/transfer', {
      method: 'POST',
      auth: true,
      headers: { 'X-Organization-Id': 'org-1' },
      body: {
        offerId: 'o1',
        fromLocationId: 'l1',
        toLocationId: 'l2',
        quantity: 30,
        reason: 'Развоз по точке',
      },
    });
  });

  it('ошибки API проксываются (REJECT прокидывается)', async () => {
    apiRequestMock.mockRejectedValue(new Error('Сервер временно недоступен'));
    await expect(fetchStockLocations()).rejects.toThrow(
      'Сервер временно недоступен',
    );
  });

  it('экспортирует тип результата движения', () => {
    // Компиляционная проверка формы ответа.
    const result: StockMovementResult = {
      balance: {
        offerId: 'o1',
        locationId: 'l1',
        locationName: 'Основной склад',
        physicalQty: 150,
        reservedQty: 0,
        availableQty: 150,
        updatedAt: '2026-11-15T08:00:00Z',
      },
      totals: {
        offerId: 'o1',
        physicalQty: 150,
        reservedQty: 0,
        availableQty: 150,
        locationsCount: 1,
      },
    };
    expect(result.totals.physicalQty).toBe(150);
  });
});
