/**
 * Тесты cartApi (Промт 9, Часть D): маршруты, методы, заголовок
 * контура X-Organization-Id. Мок apiRequest — проверяем параметры.
 */
import * as client from '../client';
import {
  addCartItem,
  clearCart,
  fetchCart,
  removeCartItem,
  updateCartItem,
} from '../cartApi';

jest.mock('../client', () => ({
  apiRequest: jest.fn(),
}));

jest.mock('../../../stores/contextStore', () => ({
  useContextStore: {
    getState: () => ({ active: { organizationId: null } }),
  },
}));

const apiRequestMock = jest.mocked(client.apiRequest);
const emptyCart = { items: [], subtotal: 0, warnings: [] };

describe('cartApi', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it('fetchCart: GET /cart с авторизацией', async () => {
    apiRequestMock.mockResolvedValue(emptyCart);
    await fetchCart();
    expect(apiRequestMock).toHaveBeenCalledWith('/cart', {
      auth: true,
      headers: {},
    });
  });

  it('addCartItem: POST /cart/items с телом offerId+quantity', async () => {
    apiRequestMock.mockResolvedValue(emptyCart);
    await addCartItem('offer-1', 10);
    expect(apiRequestMock).toHaveBeenCalledWith('/cart/items', {
      method: 'POST',
      auth: true,
      headers: {},
      body: { offerId: 'offer-1', quantity: 10 },
    });
  });

  it('updateCartItem: PATCH /cart/items/:id с количеством', async () => {
    apiRequestMock.mockResolvedValue(emptyCart);
    await updateCartItem('item-1', 20);
    expect(apiRequestMock).toHaveBeenCalledWith('/cart/items/item-1', {
      method: 'PATCH',
      auth: true,
      headers: {},
      body: { quantity: 20 },
    });
  });

  it('removeCartItem: DELETE /cart/items/:id', async () => {
    apiRequestMock.mockResolvedValue(emptyCart);
    await removeCartItem('item-1');
    expect(apiRequestMock).toHaveBeenCalledWith('/cart/items/item-1', {
      method: 'DELETE',
      auth: true,
      headers: {},
    });
  });

  it('clearCart: DELETE /cart', async () => {
    apiRequestMock.mockResolvedValue(emptyCart);
    await clearCart();
    expect(apiRequestMock).toHaveBeenCalledWith('/cart', {
      method: 'DELETE',
      auth: true,
      headers: {},
    });
  });

  it('контур организации передаётся заголовком X-Organization-Id', async () => {
    const store = jest.requireMock('../../../stores/contextStore') as {
      useContextStore: {
        getState: () => { active: { organizationId: string | null } };
      };
    };
    const original = store.useContextStore.getState;
    store.useContextStore.getState = () => ({
      active: { organizationId: 'org-42' },
    });
    apiRequestMock.mockResolvedValue(emptyCart);
    await fetchCart();
    expect(apiRequestMock).toHaveBeenCalledWith('/cart', {
      auth: true,
      headers: { 'X-Organization-Id': 'org-42' },
    });
    store.useContextStore.getState = original;
  });
});
