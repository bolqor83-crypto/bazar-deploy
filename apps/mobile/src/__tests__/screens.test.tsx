/**
 * Смоук-тесты экранов-заглушек: каждый экран рендерится,
 * содержит осмысленный EmptyState и корректный заголовок.
 */
import { render } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import type { ActiveContext } from '@bazar/types';
import { customerContext, mockMemberships } from '../mocks/context';
import { useContextStore } from '../stores/contextStore';

import HomeScreen from '../app/(tabs)/customer/home';
import OrdersScreen from '../app/(tabs)/customer/orders';
import DeliveriesScreen from '../app/(tabs)/customer/deliveries';
import FavoritesScreen from '../app/(tabs)/customer/favorites';
import CustomerProfileScreen from '../app/(tabs)/customer/profile';

import PurchaseScreen from '../app/(tabs)/store/purchase';
import StoreFeedScreen from '../app/(tabs)/store/feed';
import StorefrontScreen from '../app/(tabs)/store/storefront';
import StoreOrdersScreen from '../app/(tabs)/store/orders';
import DebtsScreen from '../app/(tabs)/store/debts';
import NotesScreen from '../app/(tabs)/store/notes';
import StoreFinanceScreen from '../app/(tabs)/store/finance';
import StoreProfileScreen from '../app/(tabs)/store/profile';
import StoreSettingsScreen from '../app/(tabs)/store/settings';

import OverviewScreen from '../app/(tabs)/wholesale/overview';
import ProductsScreen from '../app/(tabs)/wholesale/products';
import WholesaleOrdersScreen from '../app/(tabs)/wholesale/orders';
import RequestsScreen from '../app/(tabs)/wholesale/requests';
import ClientsScreen from '../app/(tabs)/wholesale/clients';
import WholesaleFinanceScreen from '../app/(tabs)/wholesale/finance';
import AnalyticsScreen from '../app/(tabs)/wholesale/analytics';
import WholesaleProfileScreen from '../app/(tabs)/wholesale/profile';
import WholesaleSettingsScreen from '../app/(tabs)/wholesale/settings';

import CarrierFeedScreen from '../app/(tabs)/carrier/feed';
import MyRequestsScreen from '../app/(tabs)/carrier/my-requests';
import InTransitScreen from '../app/(tabs)/carrier/in-transit';
import HistoryScreen from '../app/(tabs)/carrier/history';
import CarrierProfileScreen from '../app/(tabs)/carrier/profile';

type ScreenModule = ComponentType;
type Row = [string, ScreenModule, string, string, ActiveContext];

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
  ['customer/home', HomeScreen, 'Главная', 'Главная пока готовится', CUSTOMER],
  ['customer/orders', OrdersScreen, 'Заказы', 'Заказов пока нет', CUSTOMER],
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
    'Лента предложений появится здесь, когда будет API.',
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
    'store/orders',
    StoreOrdersScreen,
    'Заказы',
    'Заказов точки пока нет',
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
    'Обзор в разработке',
    WHOLESALE,
  ],
  [
    'wholesale/products',
    ProductsScreen,
    'Товары',
    'Товаров пока нет',
    WHOLESALE,
  ],
  [
    'wholesale/orders',
    WholesaleOrdersScreen,
    'Заказы',
    'Заказов пока нет',
    WHOLESALE,
  ],
  [
    'wholesale/requests',
    RequestsScreen,
    'Запросы',
    'Заявок пока нет',
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
    'Лента заявок появится здесь, когда будет API.',
    CARRIER,
  ],
  [
    'carrier/my-requests',
    MyRequestsScreen,
    'Заявки',
    'Принятых заявок пока нет',
    CARRIER,
  ],
  [
    'carrier/in-transit',
    InTransitScreen,
    'В пути',
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
      const screen = await render(<Screen />);
      // Заголовок есть и в шапке, и в подписи вкладки таб-бара
      expect(screen.getAllByText(title).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(emptyTitle)).toBeTruthy();
    },
  );

  it('заглушки не используют текст «Нет данных»', async () => {
    const screen = await render(<HomeScreen />);
    expect(screen.queryByText('Нет данных')).toBeNull();
  });

  it('экран «Закупка» содержит действие «Создать закупку»', async () => {
    useContextStore.setState({ active: STORE, memberships: mockMemberships });
    const screen = await render(<PurchaseScreen />);
    expect(
      screen.getByRole('button', { name: 'Создать закупку' }),
    ).toBeTruthy();
  });
});
