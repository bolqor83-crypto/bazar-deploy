/**
 * Тесты группировки заказов на экранах (Промт 15, Часть E).
 *
 * Покупатель: группы по продавцу, переключатель режимов с
 * персистом в AsyncStorage, фильтры пересчитывают группы,
 * завершённые группы свёрнуты. Продавец: группы по покупателю.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Order,
  OrderList,
  SellerOrder,
  SellerOrderList,
} from '@bazar/types';
import { customerContext } from '../mocks/context';
import { useContextStore } from '../stores/contextStore';
import { fetchOrders } from '../services/api/orderApi';
import { fetchSellerOrders } from '../services/api/sellerApi';
import OrdersScreen from '../components/screens/OrdersScreen';
import SellerOrdersScreen from '../app/(tabs)/wholesale/orders';

jest.mock('../services/api/orderApi', () => ({
  ...jest.requireActual('../services/api/orderApi'),
  fetchOrders: jest.fn(),
}));
jest.mock('../services/api/sellerApi', () => ({
  ...jest.requireActual('../services/api/sellerApi'),
  fetchSellerOrders: jest.fn(),
}));
jest.mock('../services/api/notificationApi', () => ({
  fetchUnreadCount: jest.fn().mockResolvedValue(0),
}));

const fetchOrdersMock = jest.mocked(fetchOrders);
const fetchSellerOrdersMock = jest.mocked(fetchSellerOrders);

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

function order(partial: Partial<Order>): Order {
  return {
    id: 'o1',
    number: 'BZ-2026-000001',
    status: 'CONFIRMED',
    subtotal: 100_000,
    deliveryCost: 0,
    total: 100_000,
    address: null,
    comment: null,
    createdAt: '2026-11-16T08:00:00Z',
    updatedAt: '2026-11-16T08:00:00Z',
    seller: { id: 'org-1', name: 'Опт-Юг' },
    items: [
      {
        id: 'oi1',
        offerId: 'of1',
        title: 'Помидоры розовые',
        unit: '1 кг',
        price: 100_000,
        quantity: 1,
        total: 100_000,
      },
    ],
    events: [],
    delivery: null,
    ...partial,
  };
}

/** Сценарий ТЗ: 2 заказа к «Опт-Юг» + 1 к другому продавцу. */
const twoSellers: Order[] = [
  order({
    id: 'o1',
    status: 'CONFIRMED',
    total: 800_000,
    createdAt: '2026-11-17T08:00:00Z',
  }),
  order({
    id: 'o2',
    number: 'BZ-2026-000002',
    status: 'COMPLETED',
    total: 440_000,
    createdAt: '2026-11-15T08:00:00Z',
  }),
  order({
    id: 'o3',
    number: 'BZ-2026-000003',
    status: 'PENDING',
    total: 250_000,
    createdAt: '2026-11-16T08:00:00Z',
    seller: { id: 'org-2', name: 'Агрофирма Север' },
  }),
];

const orderList: OrderList = {
  items: twoSellers,
  total: 3,
  page: 1,
  pageSize: 20,
  hasMore: false,
};

function sellerOrder(partial: Partial<SellerOrder>): SellerOrder {
  return {
    ...order(partial),
    buyer: { id: 'b1', name: 'Магазин на Садовой', phone: '+79001112233' },
    ...partial,
  };
}

const sellerOrdersList: SellerOrderList = {
  items: [
    sellerOrder({ id: 'so1', status: 'PENDING' }),
    sellerOrder({
      id: 'so2',
      buyer: { id: 'b2', name: 'Кафе Уют', phone: '+79001112244' },
      status: 'COMPLETED',
    }),
  ],
  total: 2,
  page: 1,
  pageSize: 20,
  hasMore: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.clear();
  useContextStore.setState({
    ...useContextStore.getState(),
    active: customerContext,
    hydrated: true,
  });
  fetchOrdersMock.mockResolvedValue(orderList);
  fetchSellerOrdersMock.mockResolvedValue(sellerOrdersList);
});

describe('Заказы покупателя — группировка (Промт 15, E)', () => {
  it('по умолчанию grouped: две группы по продавцам', async () => {
    const screen = await renderWithQuery(<OrdersScreen basePath="customer" />);
    await waitFor(() => {
      expect(screen.getByText('Опт-Юг')).toBeTruthy();
    });
    expect(screen.getByText('Агрофирма Север')).toBeTruthy();
    // Мета группы Опт-Юг: 2 заказа · сумма без отменённых.
    expect(screen.getByText(/2 заказа · 12[\s\u202F]400 ₽/)).toBeTruthy();
  });

  it('активная группа развёрнута, завершённая свёрнута', async () => {
    const screen = await renderWithQuery(<OrdersScreen basePath="customer" />);
    await waitFor(() => {
      expect(screen.getByText('Опт-Юг')).toBeTruthy();
    });
    // Опт-Юг (CONFIRMED + COMPLETED): hasActive → развёрнута,
    // номера заказов видны.
    expect(screen.getByText('BZ-2026-000001')).toBeTruthy();
    expect(screen.getByText('BZ-2026-000002')).toBeTruthy();
    // Агрофирма Север — PENDING → тоже активна и развёрнута.
    expect(screen.getByText('BZ-2026-000003')).toBeTruthy();

    // Все заказы завершённые → группа свёрнута: проверяем через
    // отдельный набор данных.
    fetchOrdersMock.mockResolvedValue({
      ...orderList,
      items: [
        order({ id: 'c1', status: 'COMPLETED' }),
        order({ id: 'c2', status: 'CANCELLED' }),
      ],
    });
    const screen2 = await renderWithQuery(<OrdersScreen basePath="customer" />);
    await waitFor(() => {
      expect(screen2.getByText('Опт-Юг')).toBeTruthy();
    });
    expect(screen2.queryByText('BZ-2026-000001')).toBeNull();
  });

  it('переключение «По дате» — плоский список, и обратно', async () => {
    const screen = await renderWithQuery(<OrdersScreen basePath="customer" />);
    await waitFor(() => {
      expect(screen.getByText('Опт-Юг')).toBeTruthy();
    });
    await fireEvent.press(screen.getByLabelText('По дате'));
    await waitFor(() => {
      // Плоский список: карточки без заголовков групп.
      expect(screen.queryByText(/2 заказа/)).toBeNull();
      expect(screen.getByTestId('order-card-0')).toBeTruthy();
    });
    await fireEvent.press(screen.getByLabelText('По продавцам'));
    await waitFor(() => {
      expect(screen.getByText(/2 заказа/)).toBeTruthy();
    });
  });

  it('режим сохраняется в AsyncStorage сразу при переключении', async () => {
    const screen = await renderWithQuery(<OrdersScreen basePath="customer" />);
    await waitFor(() => {
      expect(screen.getByText('Опт-Юг')).toBeTruthy();
    });
    await fireEvent.press(screen.getByLabelText('По дате'));
    await waitFor(() => {
      expect(AsyncStorage.getItem('bazar.orders.viewMode')).resolves.toBe(
        'chronological',
      );
    });
  });

  it('новый экран читает сохранённый режим (персист)', async () => {
    await AsyncStorage.setItem('bazar.orders.viewMode', 'chronological');
    const screen = await renderWithQuery(<OrdersScreen basePath="customer" />);
    await waitFor(() => {
      expect(screen.getByTestId('order-card-0')).toBeTruthy();
      expect(screen.queryByText(/2 заказа/)).toBeNull();
    });
  });

  it('фильтр «Завершённые» пересчитывает группы', async () => {
    const screen = await renderWithQuery(<OrdersScreen basePath="customer" />);
    await waitFor(() => {
      expect(screen.getByText('Опт-Юг')).toBeTruthy();
    });
    fetchOrdersMock.mockClear();
    fetchOrdersMock.mockResolvedValue({
      ...orderList,
      items: [twoSellers[1] as Order],
    });
    await fireEvent.press(screen.getByLabelText('Фильтр: Завершён'));
    await waitFor(() => {
      // Только завершённый заказ Опт-Юг: группа из 1 заказа.
      expect(screen.getByText(/1 заказ · 4[\s\u202F]400 ₽/)).toBeTruthy();
      // Пустых групп нет — Агрофирма Север скрыта.
      expect(screen.queryByText('Агрофирма Север')).toBeNull();
    });
  });

  it('скелетон при загрузке: заголовки групп и карточки', async () => {
    fetchOrdersMock.mockReturnValue(new Promise(() => undefined));
    const screen = await renderWithQuery(<OrdersScreen basePath="customer" />);
    await waitFor(() => {
      expect(screen.getByLabelText('По продавцам')).toBeTruthy();
    });
    expect(screen.queryByText('Опт-Юг')).toBeNull();
  });
});

describe('Заказы продавца — группировка по покупателям (Промт 15, E)', () => {
  it('группирует по покупателю', async () => {
    const screen = await renderWithQuery(<SellerOrdersScreen />);
    await waitFor(() => {
      expect(screen.getByText('Магазин на Садовой')).toBeTruthy();
    });
    expect(screen.getByText('Кафе Уют')).toBeTruthy();
    // Активная группа (PENDING) развёрнута — номер заказа виден.
    expect(screen.getByText('BZ-2026-000001')).toBeTruthy();
  });

  it('переключатель «По покупателям | По дате» работает', async () => {
    const screen = await renderWithQuery(<SellerOrdersScreen />);
    await waitFor(() => {
      expect(screen.getByText('Магазин на Садовой')).toBeTruthy();
    });
    await fireEvent.press(screen.getByLabelText('По дате'));
    await waitFor(() => {
      expect(screen.queryByText('Магазин на Садовой')).toBeNull();
      expect(screen.getByTestId('seller-order-card-0')).toBeTruthy();
    });
  });
});
