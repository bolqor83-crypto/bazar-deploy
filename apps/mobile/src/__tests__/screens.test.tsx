/**
 * Смоук-тесты экранов-заглушек: каждый экран рендерится,
 * содержит осмысленный EmptyState и корректный заголовок.
 */
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComponentType, ReactNode } from 'react';
import type { ActiveContext } from '@bazar/types';
import { customerContext, mockMemberships } from '../mocks/context';
import { useContextStore } from '../stores/contextStore';

import DeliveriesScreen from '../app/(tabs)/customer/deliveries';
import FavoritesScreen from '../app/(tabs)/customer/favorites';
import CustomerProfileScreen from '../app/(tabs)/customer/profile';

import PurchaseScreen from '../app/(tabs)/store/purchase';
import StoreFeedScreen from '../app/(tabs)/store/feed';
import StorefrontScreen from '../app/(tabs)/store/storefront';
import DebtsScreen from '../app/(tabs)/store/debts';
import NotesScreen from '../app/(tabs)/store/notes';
import StoreFinanceScreen from '../app/(tabs)/store/finance';
import StoreProfileScreen from '../app/(tabs)/store/profile';
import StoreSettingsScreen from '../app/(tabs)/store/settings';

import OverviewScreen from '../app/(tabs)/wholesale/overview';
// wholesale/products — рабочий экран кабинета продавца (Промт 10):
// его тесты в seller-screens.test.tsx.
// wholesale/orders — рабочий экран заказов продавца (Часть C):
// его тесты в seller-orders.test.tsx.
import RequestsScreen from '../app/(tabs)/wholesale/requests';
import ClientsScreen from '../app/(tabs)/wholesale/clients';
import WholesaleFinanceScreen from '../app/(tabs)/wholesale/finance';
import AnalyticsScreen from '../app/(tabs)/wholesale/analytics';
import WholesaleProfileScreen from '../app/(tabs)/wholesale/profile';
import WholesaleSettingsScreen from '../app/(tabs)/wholesale/settings';

import CarrierFeedScreen from '../app/(tabs)/carrier/feed';
import MyDeliveriesScreen from '../app/(tabs)/carrier/my-deliveries';
import HistoryScreen from '../app/(tabs)/carrier/history';
import CarrierProfileScreen from '../app/(tabs)/carrier/profile';

// Профиль покупателя тянет счётчик уведомлений (Часть C) — мокаем,
// чтобы смоук-тесты не зависели от сети.
jest.mock('../services/api/priceRequestApi', () => ({
  fetchMyPriceRequests: jest.fn().mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
    hasMore: false,
  }),
  fetchIncomingPriceRequests: jest.fn().mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
    hasMore: false,
  }),
  createPriceRequest: jest.fn(),
  respondPriceRequest: jest.fn(),
  declinePriceRequest: jest.fn(),
}));

jest.mock('../services/api/notificationApi', () => ({
  fetchNotifications: jest.fn(),
  fetchUnreadCount: jest.fn().mockResolvedValue(0),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}));

// Промт 10, Часть D: экраны перевозчика тянут доставки — пусто.
jest.mock('../services/api/deliveryApi', () => ({
  createDelivery: jest.fn(),
  fetchDelivery: jest.fn(),
  completeDelivery: jest.fn(),
  cancelDelivery: jest.fn(),
  fetchCarrierDeliveries: jest.fn().mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 30,
    hasMore: false,
  }),
  fetchCarrierDelivery: jest.fn(),
  postCarrierDeliveryAction: jest.fn(),
}));

type ScreenModule = ComponentType;
type Row = [string, ScreenModule, string, string, ActiveContext];

/** Рендер с провайдером запросов (RoleScreen → useCartBadge). */
function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const CUSTOMER: ActiveContext = { ...customerContext };
const STORE: ActiveContext = {
  userId: 'u1',
  role: 'store_owner',
  organizationId: 'o2',
  locationId: null,
};
const WHOLESALE: ActiveContext = {
  userId: 'u1',
  role: 'wholesale_seller',
  organizationId: 'o1',
  locationId: null,
};
const CARRIER: ActiveContext = {
  userId: 'u1',
  role: 'carrier',
  organizationId: 'o4',
  locationId: null,
};

/** Экран → [маршрут, компонент, заголовок, текст EmptyState, контекст]. */
const SCREENS: readonly Row[] = [
  // customer/orders и store/orders — реальные экраны заказов
  // (Промт 9), их тесты — в cart-orders.test.tsx.
  [
    'customer/deliveries',
    DeliveriesScreen,
    'Доставки',
    'Доставок пока нет',
    CUSTOMER,
  ],
  [
    'customer/favorites',
    FavoritesScreen,
    'Избранное',
    'Список избранного пуст',
    CUSTOMER,
  ],
  [
    'customer/profile',
    CustomerProfileScreen,
    'Профиль',
    'Выйти из аккаунта',
    CUSTOMER,
  ],

  [
    'store/purchase',
    PurchaseScreen,
    'Закупка',
    'Пока нет активной закупки',
    STORE,
  ],
  [
    'store/feed',
    StoreFeedScreen,
    'Лента',
    'Предложения поставщиков появятся здесь',
    STORE,
  ],
  [
    'store/storefront',
    StorefrontScreen,
    'Витрина',
    'Витрина точки в разработке',
    STORE,
  ],
  [
    'store/debts',
    DebtsScreen,
    'Долги',
    'Долгов пока нет. Когда появятся — увидите здесь.',
    STORE,
  ],
  ['store/notes', NotesScreen, 'Заметки', 'Заметок пока нет', STORE],
  [
    'store/finance',
    StoreFinanceScreen,
    'Финансы',
    'Финансы в разработке',
    STORE,
  ],
  ['store/profile', StoreProfileScreen, 'Профиль', 'Выйти из аккаунта', STORE],
  [
    'store/settings',
    StoreSettingsScreen,
    'Настройки',
    'Настройки в разработке',
    STORE,
  ],

  [
    'wholesale/overview',
    OverviewScreen,
    'Обзор',
    'Показатели соберутся с первыми заказами',
    WHOLESALE,
  ],
  [
    'wholesale/requests',
    RequestsScreen,
    'Запросы цен',
    'Запросов пока нет',
    WHOLESALE,
  ],
  [
    'wholesale/clients',
    ClientsScreen,
    'Клиенты',
    'Клиентов пока нет',
    WHOLESALE,
  ],
  [
    'wholesale/finance',
    WholesaleFinanceScreen,
    'Финансы',
    'Финансы в разработке',
    WHOLESALE,
  ],
  [
    'wholesale/analytics',
    AnalyticsScreen,
    'Аналитика',
    'Аналитика в разработке',
    WHOLESALE,
  ],
  [
    'wholesale/profile',
    WholesaleProfileScreen,
    'Профиль',
    'Выйти из аккаунта',
    WHOLESALE,
  ],
  [
    'wholesale/settings',
    WholesaleSettingsScreen,
    'Настройки',
    'Настройки в разработке',
    WHOLESALE,
  ],

  [
    'carrier/feed',
    CarrierFeedScreen,
    'Лента',
    'Свободных заявок пока нет',
    CARRIER,
  ],
  [
    'carrier/my-deliveries',
    MyDeliveriesScreen,
    'Рейсы',
    'Активных рейсов нет',
    CARRIER,
  ],
  [
    'carrier/history',
    HistoryScreen,
    'История',
    'История доставок пуста',
    CARRIER,
  ],
  [
    'carrier/profile',
    CarrierProfileScreen,
    'Профиль',
    'Выйти из аккаунта',
    CARRIER,
  ],
];

describe('Экраны-заглушки', () => {
  beforeEach(() => {
    useContextStore.setState({
      active: { ...customerContext },
      memberships: mockMemberships,
      hydrated: true,
    });
  });

  it.each(SCREENS)(
    '%s: рендерится с заголовком и EmptyState',
    async (_route, Screen, title, emptyTitle, active) => {
      useContextStore.setState({ active, memberships: mockMemberships });
      const screen = await renderWithQuery(<Screen />);
      // Заголовок есть и в шапке, и в подписи вкладки таб-бара
      expect(screen.getAllByText(title).length).toBeGreaterThanOrEqual(1);
      // Экраны данных (Промт 10, Часть D) уходят из Skeleton
      // асинхронно — ждём текст, а не требуем сразу.
      expect(await screen.findByText(emptyTitle)).toBeTruthy();
    },
  );

  it('заглушки не используют текст «Нет данных»', async () => {
    const screen = await renderWithQuery(<FavoritesScreen />);
    expect(screen.queryByText('Нет данных')).toBeNull();
  });

  it('экран «Закупка» содержит действие «Создать закупку»', async () => {
    useContextStore.setState({ active: STORE, memberships: mockMemberships });
    const screen = await renderWithQuery(<PurchaseScreen />);
    expect(
      screen.getByRole('button', { name: 'Создать закупку' }),
    ).toBeTruthy();
  });
});
