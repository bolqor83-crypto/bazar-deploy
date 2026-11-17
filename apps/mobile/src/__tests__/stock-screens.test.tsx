/**
 * Тесты экранов склада (Промт 11b): обзор (empty/list/фильтры/поиск),
 * журнал по позиции (типы движений, пустой), формы движения и
 * перемещения (валидация, submit), склады (CRUD-шит).
 *
 * API замокан: проверяется рендер, состояния и переходы.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StockScreen from '../app/(tabs)/wholesale/stock';
import StockDetailScreen from '../app/(tabs)/wholesale/stock/[id]';
import MovementFormScreen from '../app/(tabs)/wholesale/stock/[id]/movement';
import TransferFormScreen from '../app/(tabs)/wholesale/stock/[id]/transfer';
import LocationsScreen from '../app/(tabs)/wholesale/stock/locations';
import OverviewScreen from '../app/(tabs)/wholesale/overview';
import { useAuthStore, __resetAuthStoreForTests } from '../stores/authStore';
import { useContextStore } from '../stores/contextStore';

jest.mock('../services/api/stockApi', () => ({
  fetchStockLocations: jest.fn(),
  createStockLocation: jest.fn(),
  updateStockLocation: jest.fn(),
  deleteStockLocation: jest.fn(),
  fetchStockBalances: jest.fn(),
  fetchStockSummary: jest.fn(),
  fetchStockMovements: jest.fn(),
  createStockMovement: jest.fn(),
  transferStock: jest.fn(),
}));

jest.mock('../services/api/sellerApi', () => ({
  fetchSellerOffers: jest.fn(),
  fetchSellerOffer: jest.fn(),
}));

/** Параметры маршрута (id + type режима формы) — мутируются тестами. */
const mockParams: { id: string; type?: string } = { id: 'offer-1' };

jest.mock('expo-router', () => {
  const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
  return {
    __esModule: true,
    router: mockRouter,
    useRouter: () => mockRouter,
    useLocalSearchParams: jest.fn(() => mockParams),
    usePathname: () => '/',
    useSegments: () => [],
    Link: ({ children }: { children: React.ReactNode }) => children,
    Stack: { Screen: () => null },
  };
});

const stockApi = jest.requireMock('../services/api/stockApi') as {
  fetchStockLocations: jest.Mock;
  fetchStockBalances: jest.Mock;
  fetchStockMovements: jest.Mock;
  fetchStockSummary: jest.Mock;
  createStockMovement: jest.Mock;
  transferStock: jest.Mock;
  createStockLocation: jest.Mock;
};
const sellerApi = jest.requireMock('../services/api/sellerApi') as {
  fetchSellerOffers: jest.Mock;
  fetchSellerOffer: jest.Mock;
};
const routerMock = jest.requireMock('expo-router') as unknown as {
  router: { push: jest.Mock; replace: jest.Mock; back: jest.Mock };
  useLocalSearchParams: () => { id: string; type?: string };
};

const WHOLESALE = {
  userId: 'u1',
  role: 'wholesale_seller' as const,
  organizationId: 'org-1',
  locationId: null,
};

const LOCATIONS = [
  {
    id: 'loc-1',
    name: 'Основной склад',
    type: 'WAREHOUSE',
    address: null,
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'loc-2',
    name: 'Точка на Северной',
    type: 'STORE',
    address: 'ул. Северная, 1',
    isDefault: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const OFFERS = [
  {
    id: 'offer-1',
    productId: 'p1',
    product: {
      id: 'p1',
      name: 'Огурцы гладкие',
      subtitle: null,
      unit: 'кг',
      images: '[]',
      archivedAt: null,
    },
    price: 4500,
    stock: 115,
    minQuantity: 5,
    badge: null,
    isPerishable: true,
    archivedAt: null,
    priceHistory: [],
    stockChanges: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'offer-2',
    productId: 'p2',
    product: {
      id: 'p2',
      name: 'Томаты розовые',
      subtitle: null,
      unit: 'кг',
      images: '[]',
      archivedAt: null,
    },
    price: 5200,
    stock: 8,
    minQuantity: 5,
    badge: null,
    isPerishable: false,
    archivedAt: null,
    priceHistory: [],
    stockChanges: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'offer-3',
    productId: 'p3',
    product: {
      id: 'p3',
      name: 'Тыква',
      subtitle: null,
      unit: 'шт',
      images: '[]',
      archivedAt: null,
    },
    price: 30000,
    stock: 0,
    minQuantity: 1,
    badge: null,
    isPerishable: false,
    archivedAt: null,
    priceHistory: [],
    stockChanges: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

function balancesList(items: unknown[]) {
  return { items, total: items.length, page: 1, pageSize: 50, hasMore: false };
}

async function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const screen = await render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
  return { screen, client };
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
  useContextStore.setState({
    active: WHOLESALE,
    memberships: [],
    hydrated: true,
  });
  mockParams.id = 'offer-1';
  delete mockParams.type;
  stockApi.fetchStockLocations.mockResolvedValue(LOCATIONS);
  sellerApi.fetchSellerOffers.mockResolvedValue({
    items: OFFERS,
    total: 3,
    page: 1,
    pageSize: 100,
    hasMore: false,
  });
  return AsyncStorage.clear();
});

describe('StockScreen (обзор)', () => {
  it('пустой склад — осмысленный EmptyState с CTA «Добавить приход»', async () => {
    stockApi.fetchStockBalances.mockResolvedValue(balancesList([]));
    sellerApi.fetchSellerOffers.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
      hasMore: false,
    });
    const { screen } = await renderWithQuery(<StockScreen />);
    expect(await screen.findAllByText('Склад пуст')).toBeTruthy();
    // Кнопка прихода и в панели, и в пустом состоянии.
    expect(
      (await screen.findAllByRole('button', { name: 'Добавить приход' }))
        .length,
    ).toBeGreaterThan(0);
  });

  it('FAB убран: плавающей кнопки нет, вход — из панели управления', async () => {
    stockApi.fetchStockBalances.mockResolvedValue(
      balancesList([
        {
          offerId: 'offer-1',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 120,
          reservedQty: 5,
          availableQty: 115,
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ]),
    );
    const { screen } = await renderWithQuery(<StockScreen />);
    await screen.findAllByText('Огурцы гладкие');
    expect(screen.queryByTestId('stock-fab')).toBeNull();
    expect(screen.queryByTestId('fab-action-RECEIPT')).toBeNull();
    expect(screen.getByTestId('stock-add-receipt')).toBeTruthy();
  });

  it('сводка — одна панель: Позиций/Мало/Нет табличными цифрами', async () => {
    stockApi.fetchStockBalances.mockResolvedValue(
      balancesList([
        {
          offerId: 'offer-1',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 120,
          reservedQty: 5,
          availableQty: 115,
          updatedAt: '2026-11-15T08:00:00Z',
        },
        {
          offerId: 'offer-2',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 8,
          reservedQty: 0,
          availableQty: 8,
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ]),
    );
    const { screen } = await renderWithQuery(<StockScreen />);
    expect(await screen.findAllByText('Позиций')).toBeTruthy();
    // Сводка-панель и чипы фильтра: «Мало»/«Нет» встречаются дважды.
    expect(screen.getAllByText('Мало').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Нет').length).toBeGreaterThan(0);
    // Позиций 3 — все активные предложения (offer-3 без остатка тоже
    // в списке; VLM-аудит: сводка обязана сходиться со строками).
    await waitFor(() => {
      expect(screen.getByLabelText(/позиций 3/i)).toBeTruthy();
    });
  });

  it('«Добавить приход» открывает выбор позиции и ведёт в форму', async () => {
    stockApi.fetchStockBalances.mockResolvedValue(
      balancesList([
        {
          offerId: 'offer-1',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 120,
          reservedQty: 5,
          availableQty: 115,
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ]),
    );
    const { screen } = await renderWithQuery(<StockScreen />);
    await screen.findAllByText('Огурцы гладкие');
    await fireEvent.press(screen.getByTestId('stock-add-receipt'));
    expect(await screen.findAllByText('Приход: выбрать позицию')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: /Огурцы гладкие, доступно 115/ }),
    );
    expect(routerMock.router.push).toHaveBeenCalledWith(
      '/wholesale/stock/offer-1/movement?type=RECEIPT',
    );
  });

  it('остатки рендерятся StockRow с резервом и итогом', async () => {
    stockApi.fetchStockBalances.mockResolvedValue(
      balancesList([
        {
          offerId: 'offer-1',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 120,
          reservedQty: 5,
          availableQty: 115,
          updatedAt: '2026-11-15T08:00:00Z',
        },
        {
          offerId: 'offer-2',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 8,
          reservedQty: 0,
          availableQty: 8,
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ]),
    );
    const { screen } = await renderWithQuery(<StockScreen />);
    expect(await screen.findAllByText('Огурцы гладкие')).toBeTruthy();
    // Число и юнит — раздельные узлы (VLM-аудит: слитное «120 кг»
    // в одном кегле numberL читалось как одно слово).
    expect(screen.getAllByText('120').length).toBeGreaterThan(0);
    expect(screen.getAllByText('кг').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Резерв: 5 · Доступно: 115').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/₽\/кг/).length).toBeGreaterThan(0);
  });

  it('сегмент «Мало» показывает только заканчивающиеся позиции', async () => {
    stockApi.fetchStockBalances.mockResolvedValue(
      balancesList([
        {
          offerId: 'offer-1',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 120,
          reservedQty: 5,
          availableQty: 115,
          updatedAt: '2026-11-15T08:00:00Z',
        },
        {
          offerId: 'offer-2',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 8,
          reservedQty: 0,
          availableQty: 8,
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ]),
    );
    const { screen } = await renderWithQuery(<StockScreen />);
    await screen.findAllByText('Огурцы гладкие');
    await fireEvent.press(screen.getByTestId('stock-segment-low'));
    await waitFor(() => {
      expect(screen.queryByText('Огурцы гладкие')).toBeNull();
      expect(screen.getByText('Томаты розовые')).toBeTruthy();
    });
  });

  it('сегмент «Нет в наличии» — позиции с нулевым доступным', async () => {
    stockApi.fetchStockBalances.mockResolvedValue(
      balancesList([
        {
          offerId: 'offer-1',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 120,
          reservedQty: 5,
          availableQty: 115,
          updatedAt: '2026-11-15T08:00:00Z',
        },
        {
          offerId: 'offer-2',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 8,
          reservedQty: 0,
          availableQty: 8,
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ]),
    );
    const { screen } = await renderWithQuery(<StockScreen />);
    await screen.findAllByText('Огурцы гладкие');
    await fireEvent.press(screen.getByTestId('stock-segment-out'));
    await waitFor(() => {
      expect(screen.queryByText('Огурцы гладкие')).toBeNull();
      expect(screen.getByText('Тыква')).toBeTruthy();
    });
  });

  it('строка ведёт в журнал позиции', async () => {
    stockApi.fetchStockBalances.mockResolvedValue(
      balancesList([
        {
          offerId: 'offer-1',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 120,
          reservedQty: 5,
          availableQty: 115,
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ]),
    );
    const { screen } = await renderWithQuery(<StockScreen />);
    await screen.findAllByText('Огурцы гладкие');
    await fireEvent.press(screen.getByTestId('stock-row-offer-1'));
    expect(routerMock.router.push).toHaveBeenCalledWith(
      '/wholesale/stock/offer-1',
    );
  });
});

describe('StockDetailScreen (журнал)', () => {
  beforeEach(() => {
    sellerApi.fetchSellerOffer.mockResolvedValue(OFFERS[0]);
    stockApi.fetchStockSummary.mockResolvedValue({
      offerId: 'offer-1',
      physicalQty: 120,
      reservedQty: 5,
      availableQty: 115,
      locationsCount: 1,
    });
    stockApi.fetchStockBalances.mockResolvedValue(
      balancesList([
        {
          offerId: 'offer-1',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 120,
          reservedQty: 5,
          availableQty: 115,
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ]),
    );
  });

  it('карточка остатка и движения разных типов', async () => {
    stockApi.fetchStockMovements.mockResolvedValue({
      items: [
        {
          id: 'm2',
          offerId: 'offer-1',
          offerTitle: 'Огурцы гладкие',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          type: 'RESERVED',
          quantityDelta: -20,
          reason: 'Резерв заказа BZ-2026-000006',
          refType: 'order',
          refId: 'order-9',
          createdAt: '2026-11-15T09:10:00.000Z',
        },
        {
          id: 'm1',
          offerId: 'offer-1',
          offerTitle: 'Огурцы гладкие',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          type: 'RECEIPT',
          quantityDelta: 50,
          reason: 'Закупка у фермера',
          refType: 'manual',
          refId: null,
          createdAt: '2026-11-15T08:30:00.000Z',
        },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    const { screen } = await renderWithQuery(<StockDetailScreen />);
    expect(await screen.findAllByText('Приход')).toBeTruthy();
    expect(screen.getByText('Закупка у фермера')).toBeTruthy();
    // Дельта с юнитом (VLM-аудит: без юнита журнал терял информативность).
    expect(screen.getByText('+50 кг')).toBeTruthy();
    expect(screen.getByText('Резерв заказа')).toBeTruthy();
    expect(screen.getByText('−20 кг')).toBeTruthy();
    // Карточка остатка: доступно 115.
    expect(screen.getByText('115 кг')).toBeTruthy();
    // Движение с заказом — кнопка.
    expect(
      screen.getByRole('button', { name: /Резерв заказа, −20/ }),
    ).toBeTruthy();
  });

  it('пустой журнал — подсказка про приход', async () => {
    stockApi.fetchStockMovements.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    const { screen } = await renderWithQuery(<StockDetailScreen />);
    expect(await screen.findAllByText('Пока нет движений')).toBeTruthy();
    expect(
      screen.getByText(
        'Добавьте приход кнопкой выше — журнал заполнится автоматически.',
      ),
    ).toBeTruthy();
  });

  it('кнопка «Перемещение» ведёт в форму transfer', async () => {
    stockApi.fetchStockMovements.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    const { screen } = await renderWithQuery(<StockDetailScreen />);
    await screen.findAllByText('Журнал движений (0)');
    await fireEvent.press(screen.getByTestId('stock-action-transfer'));
    expect(routerMock.router.push).toHaveBeenCalledWith(
      '/wholesale/stock/offer-1/transfer',
    );
  });
});

describe('MovementFormScreen (форма движения)', () => {
  beforeEach(() => {
    sellerApi.fetchSellerOffer.mockResolvedValue(OFFERS[0]);
    stockApi.fetchStockBalances.mockResolvedValue(
      balancesList([
        {
          offerId: 'offer-1',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 120,
          reservedQty: 5,
          availableQty: 115,
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ]),
    );
  });

  it('кнопка сохранения выключена до валидности (количество + причина)', async () => {
    const { screen } = await renderWithQuery(<MovementFormScreen />);
    await screen.findAllByText(/Доступно:/);
    const save = screen.getByTestId('movement-save');
    expect(save.props.accessibilityState?.disabled).toBe(true);
  });

  it('валидная форма отправляет приход и показывает toast', async () => {
    stockApi.createStockMovement.mockResolvedValue({
      balance: {
        offerId: 'offer-1',
        locationId: 'loc-1',
        locationName: 'Основной склад',
        physicalQty: 170,
        reservedQty: 5,
        availableQty: 165,
        updatedAt: '2026-11-15T10:00:00Z',
      },
      totals: {
        offerId: 'offer-1',
        physicalQty: 170,
        reservedQty: 5,
        availableQty: 165,
        locationsCount: 1,
      },
    });
    const { screen } = await renderWithQuery(<MovementFormScreen />);
    await screen.findAllByText(/Доступно:/);
    await fireEvent.changeText(screen.getByTestId('movement-quantity'), '50');
    await fireEvent.changeText(
      screen.getByTestId('movement-reason'),
      'Закупка у фермера',
    );
    const save = screen.getByTestId('movement-save');
    expect(save.props.accessibilityState?.disabled).toBe(false);
    await fireEvent.press(save);
    await waitFor(() => {
      expect(stockApi.createStockMovement).toHaveBeenCalledWith({
        offerId: 'offer-1',
        locationId: 'loc-1',
        type: 'RECEIPT',
        quantity: 50,
        reason: 'Закупка у фермера',
      });
    });
  });

  it('чипы типа: переключение на списание меняет заголовок и валидацию', async () => {
    const { screen } = await renderWithQuery(<MovementFormScreen />);
    await screen.findAllByText(/Доступно:/);
    expect(
      screen.getByTestId('movement-kind-receipt').props.accessibilityState
        .selected,
    ).toBe(true);
    await fireEvent.press(screen.getByTestId('movement-kind-writeoff'));
    expect(
      screen.getByTestId('movement-kind-writeoff').props.accessibilityState
        .selected,
    ).toBe(true);
    // Заголовок формы сменился на «Списание», появились быстрые причины.
    expect(screen.getByTestId('writeoff-reason-порча')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('movement-quantity'), '999');
    expect(
      await screen.findAllByText('Недоступно: на складе только 115 кг'),
    ).toBeTruthy();
  });

  it('чип «Перемещение» ведёт на форму transfer', async () => {
    const { screen } = await renderWithQuery(<MovementFormScreen />);
    await screen.findAllByText(/Доступно:/);
    await fireEvent.press(screen.getByTestId('movement-kind-transfer'));
    expect(routerMock.router.replace).toHaveBeenCalledWith(
      '/wholesale/stock/offer-1/transfer',
    );
  });

  it('списание больше доступного — inline ошибка, submit заблокирован', async () => {
    mockParams.type = 'WRITE_OFF';
    const { screen } = await renderWithQuery(<MovementFormScreen />);
    await screen.findAllByText(/Доступно:/);
    await fireEvent.changeText(screen.getByTestId('movement-quantity'), '999');
    expect(
      await screen.findAllByText('Недоступно: на складе только 115 кг'),
    ).toBeTruthy();
    const save = screen.getByTestId('movement-save');
    expect(save.props.accessibilityState?.disabled).toBe(true);
  });

  it('списание с быстрой причиной «порча» проходит', async () => {
    mockParams.type = 'WRITE_OFF';
    stockApi.createStockMovement.mockResolvedValue({
      balance: {},
      totals: {},
    });
    const { screen } = await renderWithQuery(<MovementFormScreen />);
    await screen.findAllByText(/Доступно:/);
    // Быстрые причины списания — чипы «порча», «потеря», «инвентаризация».
    expect(screen.getByTestId('writeoff-reason-порча')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('movement-quantity'), '10');
    await fireEvent.changeText(screen.getByTestId('movement-reason'), 'по');
    const save = screen.getByTestId('movement-save');
    expect(save.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('writeoff-reason-порча'));
    expect(screen.getByTestId('movement-reason').props.value).toBe('порча');
    expect(save.props.accessibilityState?.disabled).toBe(false);
  });
});

describe('TransferFormScreen (перемещение)', () => {
  beforeEach(() => {
    sellerApi.fetchSellerOffer.mockResolvedValue(OFFERS[0]);
    stockApi.fetchStockBalances.mockResolvedValue(
      balancesList([
        {
          offerId: 'offer-1',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 120,
          reservedQty: 5,
          availableQty: 115,
          updatedAt: '2026-11-15T08:00:00Z',
        },
        {
          offerId: 'offer-1',
          locationId: 'loc-2',
          locationName: 'Точка на Северной',
          physicalQty: 30,
          reservedQty: 0,
          availableQty: 30,
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ]),
    );
  });

  it('остатки обоих складов показаны крупно', async () => {
    stockApi.fetchStockMovements.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    const { screen } = await renderWithQuery(<TransferFormScreen />);
    expect(await screen.findAllByText('115 кг')).toBeTruthy();
    expect(screen.getByText('30 кг')).toBeTruthy();
  });

  it('валидное перемещение отправляется', async () => {
    stockApi.transferStock.mockResolvedValue({ items: [] });
    const { screen } = await renderWithQuery(<TransferFormScreen />);
    await screen.findAllByText('115 кг');
    await fireEvent.changeText(screen.getByTestId('transfer-quantity'), '30');
    await fireEvent.changeText(
      screen.getByTestId('transfer-reason'),
      'Развоз по точке',
    );
    await fireEvent.press(screen.getByTestId('transfer-save'));
    await waitFor(() => {
      expect(stockApi.transferStock).toHaveBeenCalledWith({
        offerId: 'offer-1',
        fromLocationId: 'loc-1',
        toLocationId: 'loc-2',
        quantity: 30,
        reason: 'Развоз по точке',
      });
    });
  });

  it('количество больше доступного на источнике — ошибка', async () => {
    const { screen } = await renderWithQuery(<TransferFormScreen />);
    await screen.findAllByText('115 кг');
    await fireEvent.changeText(screen.getByTestId('transfer-quantity'), '200');
    await waitFor(() => {
      expect(
        screen.getByText('Недоступно: на складе-источнике только 115 кг'),
      ).toBeTruthy();
    });
    expect(
      screen.getByTestId('transfer-save').props.accessibilityState?.disabled,
    ).toBe(true);
  });
});

describe('LocationsScreen (склады)', () => {
  it('список складов с типом и бейджем «Основной»', async () => {
    const { screen } = await renderWithQuery(<LocationsScreen />);
    expect(await screen.findAllByText('Основной склад')).toBeTruthy();
    expect(screen.getByText('Точка на Северной')).toBeTruthy();
    expect(screen.getByText('Торговая точка · ул. Северная, 1')).toBeTruthy();
    expect(screen.getByText('Основной')).toBeTruthy();
  });

  it('FAB открывает форму создания склада', async () => {
    const { screen } = await renderWithQuery(<LocationsScreen />);
    await screen.findAllByText('Основной склад');
    await fireEvent.press(screen.getByTestId('locations-fab'));
    expect(screen.getByText('Новый склад')).toBeTruthy();
    expect(
      screen.getByTestId('location-save').props.accessibilityState?.disabled,
    ).toBe(true);
    await fireEvent.changeText(screen.getByTestId('location-name'), 'Склад №2');
    expect(
      screen.getByTestId('location-save').props.accessibilityState?.disabled,
    ).toBe(false);
  });
});

describe('OverviewScreen (виджет склада)', () => {
  it('виджет показывает Позиций/Мало/Нет и ведёт в склад', async () => {
    stockApi.fetchStockBalances.mockResolvedValue(
      balancesList([
        {
          offerId: 'offer-1',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 120,
          reservedQty: 5,
          availableQty: 115,
          updatedAt: '2026-11-15T08:00:00Z',
        },
        {
          offerId: 'offer-2',
          locationId: 'loc-1',
          locationName: 'Основной склад',
          physicalQty: 8,
          reservedQty: 0,
          availableQty: 8,
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ]),
    );
    const { screen } = await renderWithQuery(<OverviewScreen />);
    expect(await screen.findAllByText('Позиций')).toBeTruthy();
    expect(screen.getByText('Мало')).toBeTruthy();
    expect(screen.getByText('Нет')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('overview-stock-widget'));
    expect(routerMock.router.push).toHaveBeenCalledWith('/wholesale/stock');
  });
});
