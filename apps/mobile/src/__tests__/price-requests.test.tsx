/**
 * Тесты «цены по запросу» на экранах покупателя (Промт 16, C):
 * карточка товара с POR-предложением — кнопка «Запросить цену»
 * и отправка запроса; экран «Запросы» — статусы, персональная
 * цена, кнопка «В корзину по этой цене».
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type {
  CatalogProductDetail,
  PriceRequest,
  PriceRequestList,
} from '@bazar/types';
import { ToastProvider } from '@bazar/ui';
import { fetchProduct } from '../services/api/catalogApi';
import { addCartItem } from '../services/api/cartApi';
import { createPriceRequest } from '../services/api/priceRequestApi';
import ProductScreen from '../app/(tabs)/customer/product/[id]';
import RequestsScreen from '../app/(tabs)/customer/requests';

jest.mock('../services/api/catalogApi');
jest.mock('../services/api/cartApi', () => ({
  addCartItem: jest.fn(),
  fetchCart: jest.fn(),
  updateCartItem: jest.fn(),
  removeCartItem: jest.fn(),
  clearCart: jest.fn(),
}));
jest.mock('../services/api/priceRequestApi');
jest.mock('../services/api/notificationApi', () => ({
  fetchNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}));

const mockRouterPush = jest.fn();

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    useLocalSearchParams: jest.fn(() => ({ id: 'p1' })),
    useRouter: () => ({
      push: mockRouterPush,
      back: jest.fn(),
      replace: jest.fn(),
    }),
  };
});

const fetchProductMock = jest.mocked(fetchProduct);
const addCartItemMock = jest.mocked(addCartItem);
const createPriceRequestMock = jest.mocked(createPriceRequest);

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}

/** Товар с единственным POR-предложением. */
const POR_DETAIL: CatalogProductDetail = {
  id: 'p1',
  name: 'Картофель продовольственный',
  unit: '1 кг',
  description: 'Картофель первого сорта.',
  category: { slug: 'vegetables', name: 'Овощи' },
  images: [],
  offers: [
    {
      id: 'o1',
      priceKopecks: null,
      priceOnRequest: true,
      stock: 100,
      minQuantity: 10,
      badge: null,
      isPerishable: false,
      organization: { id: 'org1', name: 'Опт-Юг' },
    },
  ],
};

describe('(tabs)/customer/product/[id]: POR-предложение', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchProductMock.mockResolvedValue(POR_DETAIL);
    createPriceRequestMock.mockResolvedValue({} as PriceRequest);
  });

  it('CTA «Запросить цену» вместо «В корзину»', async () => {
    const screen = await renderWithQuery(<ProductScreen />);
    await waitFor(() => {
      expect(screen.getByText('Картофель продовольственный')).toBeTruthy();
    });
    expect(screen.getByTestId('request-price')).toBeTruthy();
    expect(screen.queryByTestId('add-to-cart')).toBeNull();
    expect(screen.getByTestId('detail-price-on-request')).toBeTruthy();
  });

  it('шит: отправка запроса с количеством и сообщением', async () => {
    const screen = await renderWithQuery(<ProductScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('request-price')).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId('request-price'));
    await waitFor(() => {
      expect(screen.getByTestId('price-request-submit')).toBeTruthy();
    });
    await fireEvent.changeText(
      screen.getByTestId('price-request-message'),
      'Нужна отгрузка до пятницы',
    );
    await fireEvent.press(screen.getByTestId('price-request-submit'));
    await waitFor(() => {
      expect(createPriceRequestMock).toHaveBeenCalledWith({
        offerId: 'o1',
        quantity: 10,
        message: 'Нужна отгрузка до пятницы',
      });
    });
  });
});

/** Список запросов покупателя. */
const REQUESTS: PriceRequestList = {
  items: [
    {
      id: 'pr1',
      offerId: 'o1',
      quantity: 20,
      message: 'До пятницы',
      status: 'ANSWERED',
      quotedPriceKopecks: 22_000,
      validUntil: '2026-11-21T12:00:00.000Z',
      expired: false,
      respondedAt: '2026-11-18T12:00:00.000Z',
      createdAt: '2026-11-18T10:00:00.000Z',
      offer: {
        id: 'o1',
        priceKopecks: null,
        priceOnRequest: true,
        minQuantity: 10,
        product: { id: 'p1', name: 'Картофель', unit: '1 кг' },
        organization: { id: 'org1', name: 'Опт-Юг' },
      },
    },
    {
      id: 'pr2',
      offerId: 'o2',
      quantity: 30,
      message: null,
      status: 'PENDING',
      quotedPriceKopecks: null,
      validUntil: null,
      expired: false,
      respondedAt: null,
      createdAt: '2026-11-17T10:00:00.000Z',
      offer: {
        id: 'o2',
        priceKopecks: null,
        priceOnRequest: true,
        minQuantity: 5,
        product: { id: 'p2', name: 'Хурма', unit: '1 кг' },
        organization: { id: 'org1', name: 'Опт-Юг' },
      },
    },
  ],
  total: 2,
  page: 1,
  pageSize: 50,
  hasMore: false,
};

describe('(tabs)/customer/requests: запросы цены', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { fetchMyPriceRequests } = jest.requireMock(
      '../services/api/priceRequestApi',
    );
    jest.mocked(fetchMyPriceRequests).mockResolvedValue(REQUESTS);
    addCartItemMock.mockResolvedValue({
      items: [],
      subtotal: 0,
      warnings: [],
    });
  });

  it('статусы, персональная цена и кнопка покупки по quote', async () => {
    const screen = await renderWithQuery(<RequestsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Картофель')).toBeTruthy();
    });
    // Статус ANSWERED и цена предложения.
    expect(screen.getByText('Предложение готово')).toBeTruthy();
    expect(screen.getByText('Ждёт ответа')).toBeTruthy();
    // Кнопка покупки только по живому ANSWERED.
    expect(screen.getByTestId('add-by-quote')).toBeTruthy();
  });

  it('кнопка «В корзину по этой цене» передаёт priceRequestId', async () => {
    const screen = await renderWithQuery(<RequestsScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('add-by-quote')).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId('add-by-quote'));
    await waitFor(() => {
      expect(addCartItemMock).toHaveBeenCalledWith('o1', 20, 'pr1');
    });
  });
});
