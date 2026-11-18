/**
 * Тесты экранов Части C Промта 10: заказы продавца (список с
 * фильтрами, детали с действиями жизненного цикла) и уведомления
 * (лента, «Прочитать все», вход из профиля покупателя).
 *
 * API замокан: проверяется рендер, фильтры и вызовы действий.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SellerOrdersScreen from '../app/(tabs)/wholesale/orders';
import SellerOrderDetailScreen from '../app/(tabs)/wholesale/orders/[id]';
import NotificationsScreen from '../components/screens/NotificationsScreen';
import ProfileScreen from '../app/(tabs)/customer/profile';
import { useAuthStore, __resetAuthStoreForTests } from '../stores/authStore';
import { useContextStore } from '../stores/contextStore';
import type { SellerOrder } from '@bazar/types';

jest.mock('../services/api/sellerApi', () => ({
  fetchSellerProducts: jest.fn(),
  fetchSellerOffers: jest.fn(),
  fetchSellerOffer: jest.fn(),
  fetchSellerCategories: jest.fn(),
  createSellerProduct: jest.fn(),
  updateSellerProduct: jest.fn(),
  archiveSellerProduct: jest.fn(),
  createSellerOffer: jest.fn(),
  updateSellerOffer: jest.fn(),
  deleteSellerOffer: jest.fn(),
  fetchSellerOrders: jest.fn(),
  fetchSellerOrder: jest.fn(),
  postSellerOrderAction: jest.fn(),
}));

jest.mock('../services/api/notificationApi', () => ({
  fetchNotifications: jest.fn(),
  fetchUnreadCount: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}));

jest.mock('expo-router', () => {
  const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
  return {
    __esModule: true,
    router: mockRouter,
    useRouter: () => mockRouter,
    useLocalSearchParams: jest.fn(() => ({ id: 'order-1' })),
    usePathname: () => '/',
    useSegments: () => [],
    Link: ({ children }: { children: React.ReactNode }) => children,
    Stack: { Screen: () => null },
    Redirect: jest.fn(() => null),
  };
});

const sellerApi = jest.requireMock('../services/api/sellerApi') as {
  fetchSellerOrders: jest.Mock;
  fetchSellerOrder: jest.Mock;
  postSellerOrderAction: jest.Mock;
};
const notificationApi = jest.requireMock('../services/api/notificationApi') as {
  fetchNotifications: jest.Mock;
  fetchUnreadCount: jest.Mock;
  markNotificationRead: jest.Mock;
  markAllNotificationsRead: jest.Mock;
};

const WHOLESALE = {
  userId: 'u1',
  role: 'wholesale_seller' as const,
  organizationId: 'o1',
  locationId: null,
};
const CUSTOMER = {
  userId: 'u1',
  role: 'customer' as const,
  organizationId: null,
  locationId: null,
};

async function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

/** Тестовый заказ продавца. */
function makeOrder(overrides: Partial<SellerOrder> = {}): SellerOrder {
  return {
    id: 'order-1',
    number: 'BZ-2026-000001',
    status: 'PENDING',
    subtotal: 189000,
    deliveryCost: 0,
    total: 189000,
    address: null,
    comment: null,
    createdAt: '2026-11-13T08:00:00.000Z',
    updatedAt: '2026-11-13T08:00:00.000Z',
    seller: { id: 'o1', name: 'Опт-Юг' },
    buyer: { id: 'u2', name: 'Мария Петрова', phone: '+79001234567' },
    items: [
      {
        id: 'i1',
        offerId: 'offer-1',
        title: 'Помидоры розовые',
        unit: 'кг',
        price: 18900,
        quantity: 10,
        total: 189000,
      },
    ],
    events: [
      { id: 'e1', type: 'CREATED', createdAt: '2026-11-13T08:00:00.000Z' },
    ],
    delivery: null,
    ...overrides,
  };
}

function setContext(active: typeof WHOLESALE | typeof CUSTOMER) {
  useContextStore.setState({
    active,
    memberships: [],
    hydrated: true,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuthStoreForTests();
  useAuthStore.setState({
    state: 'authenticated',
    user: {
      id: 'u1',
      phone: '+79001234567',
      name: 'Иван Петров',
      createdAt: '2026-01-01T00:00:00.000Z',
      memberships: [],
    },
    token: 'access',
  });
  notificationApi.fetchUnreadCount.mockResolvedValue(0);
  return AsyncStorage.clear();
});

// -------------------------------------------------------------------
// Список заказов продавца
// -------------------------------------------------------------------

describe('SellerOrdersScreen', () => {
  beforeEach(() => {
    setContext(WHOLESALE);
  });

  it('заказы рендерятся с номером, покупателем и итогом', async () => {
    sellerApi.fetchSellerOrders.mockResolvedValue({
      items: [makeOrder()],
      total: 1,
      page: 1,
      pageSize: 10,
      hasMore: false,
    });
    await renderWithQuery(<SellerOrdersScreen />);
    expect(await screen.findByText('BZ-2026-000001')).toBeTruthy();
    // Промт 15, E: имя покупателя и в заголовке группы, и в карточке.
    expect(screen.getAllByText(/Мария Петрова/).length).toBeGreaterThan(0);
    expect(screen.getByText('1 890 ₽')).toBeTruthy();
  });

  it('пустой список новых — EmptyState про уведомления', async () => {
    sellerApi.fetchSellerOrders.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      hasMore: false,
    });
    await renderWithQuery(<SellerOrdersScreen />);
    expect(await screen.findByText('Новых заказов нет')).toBeTruthy();
  });

  it('фильтр «В работе» запрашивает CONFIRMED,PREPARING', async () => {
    sellerApi.fetchSellerOrders.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      hasMore: false,
    });
    await renderWithQuery(<SellerOrdersScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Фильтр: В работе' }));
    await waitFor(() => {
      expect(sellerApi.fetchSellerOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          statuses: ['CONFIRMED', 'PREPARING'],
        }),
      );
    });
  });

  it('ошибка загрузки — ErrorState с повтором', async () => {
    sellerApi.fetchSellerOrders.mockRejectedValue(new Error('network'));
    await renderWithQuery(<SellerOrdersScreen />);
    expect(await screen.findByText('Заказы не загрузились')).toBeTruthy();
  });
});

// -------------------------------------------------------------------
// Детали заказа продавца
// -------------------------------------------------------------------

describe('SellerOrderDetailScreen', () => {
  beforeEach(() => {
    setContext(WHOLESALE);
  });

  it('PENDING: покупатель с телефоном, кнопки «Подтвердить» и «Отменить»', async () => {
    sellerApi.fetchSellerOrder.mockResolvedValue(makeOrder());
    await renderWithQuery(<SellerOrderDetailScreen />);
    expect(await screen.findByText('BZ-2026-000001')).toBeTruthy();
    expect(screen.getByText('Мария Петрова')).toBeTruthy();
    expect(screen.getByText('+79001234567')).toBeTruthy();
    expect(screen.getByText('Помидоры розовые')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Подтвердить заказ' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Отменить заказ' })).toBeTruthy();
  });

  it('действие «Подтвердить» вызывает postSellerOrderAction', async () => {
    sellerApi.fetchSellerOrder.mockResolvedValue(makeOrder());
    sellerApi.postSellerOrderAction.mockResolvedValue(
      makeOrder({ status: 'CONFIRMED' }),
    );
    await renderWithQuery(<SellerOrderDetailScreen />);
    fireEvent.press(
      await screen.findByRole('button', { name: 'Подтвердить заказ' }),
    );
    await waitFor(() => {
      expect(sellerApi.postSellerOrderAction).toHaveBeenCalledWith(
        'order-1',
        'confirm',
      );
    });
  });

  it('READY: кнопка «Завершить продажу», без отмены', async () => {
    sellerApi.fetchSellerOrder.mockResolvedValue(
      makeOrder({ status: 'READY' }),
    );
    await renderWithQuery(<SellerOrderDetailScreen />);
    expect(
      await screen.findByRole('button', { name: 'Завершить продажу' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Отменить заказ' })).toBeNull();
  });

  it('COMPLETED: действий нет', async () => {
    sellerApi.fetchSellerOrder.mockResolvedValue(
      makeOrder({ status: 'COMPLETED' }),
    );
    await renderWithQuery(<SellerOrderDetailScreen />);
    await screen.findByText('BZ-2026-000001');
    expect(
      screen.queryByRole('button', { name: 'Подтвердить заказ' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Отменить заказ' })).toBeNull();
  });

  it('отмена: диалог подтверждения вызывает action cancel', async () => {
    sellerApi.fetchSellerOrder.mockResolvedValue(makeOrder());
    sellerApi.postSellerOrderAction.mockResolvedValue(
      makeOrder({ status: 'CANCELLED' }),
    );
    await renderWithQuery(<SellerOrderDetailScreen />);
    fireEvent.press(
      await screen.findByRole('button', { name: 'Отменить заказ' }),
    );
    expect(
      await screen.findByText('Отменить заказ?', { exact: false }),
    ).toBeTruthy();
    fireEvent.press(screen.getByTestId('seller-order-cancel-confirm'));
    await waitFor(() => {
      expect(sellerApi.postSellerOrderAction).toHaveBeenCalledWith(
        'order-1',
        'cancel',
      );
    });
  });
});

// -------------------------------------------------------------------
// Уведомления
// -------------------------------------------------------------------

describe('NotificationsScreen', () => {
  it('лента: непрочитанные с заголовком, «Прочитать все (N)»', async () => {
    notificationApi.fetchNotifications.mockResolvedValue({
      items: [
        {
          id: 'n1',
          type: 'NEW_ORDER',
          title: 'Новый заказ BZ-2026-000001',
          body: 'Покупатель Мария Петрова оформил заказ на 1 890 ₽.',
          payload: { orderId: 'order-1' },
          orderId: 'order-1',
          readAt: null,
          createdAt: '2026-11-13T08:30:00.000Z',
        },
        {
          id: 'n2',
          type: 'ORDER_STATUS',
          title: 'Заказ BZ-2026-000001 — подтверждён',
          body: 'Продавец Опт-Юг: заказ подтверждён.',
          payload: null,
          orderId: 'order-1',
          readAt: '2026-11-13T09:00:00.000Z',
          createdAt: '2026-11-13T08:10:00.000Z',
        },
      ],
      total: 2,
      page: 1,
      pageSize: 50,
      hasMore: false,
      unread: 1,
    });
    await renderWithQuery(<NotificationsScreen basePath="customer" />);
    expect(await screen.findByText('Новый заказ BZ-2026-000001')).toBeTruthy();
    expect(screen.getByText('Заказ BZ-2026-000001 — подтверждён')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Прочитать все \(1\)/ }),
    ).toBeTruthy();
  });

  it('пусто — EmptyState', async () => {
    notificationApi.fetchNotifications.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      hasMore: false,
      unread: 0,
    });
    await renderWithQuery(<NotificationsScreen basePath="wholesale" />);
    expect(await screen.findByText('Уведомлений нет')).toBeTruthy();
  });
});

// -------------------------------------------------------------------
// Профиль покупателя
// -------------------------------------------------------------------

describe('CustomerProfileScreen', () => {
  it('строка «Уведомления» с числом непрочитанных', async () => {
    setContext(CUSTOMER);
    notificationApi.fetchUnreadCount.mockResolvedValue(3);
    await renderWithQuery(<ProfileScreen />);
    await waitFor(() => {
      expect(
        screen.getByTestId('profile-notifications').props.accessibilityLabel,
      ).toBe('Уведомления, непрочитанных: 3');
    });
  });

  it('без непрочитанных число не показывается', async () => {
    setContext(CUSTOMER);
    notificationApi.fetchUnreadCount.mockResolvedValue(0);
    await renderWithQuery(<ProfileScreen />);
    expect(await screen.findByTestId('profile-notifications')).toBeTruthy();
    expect(screen.queryByText(/^\d+$/)).toBeNull();
  });
});
