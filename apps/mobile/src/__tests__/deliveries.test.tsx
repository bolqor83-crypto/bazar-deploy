/**
 * Тесты экранов Части D Промта 10: лента перевозчика (карточки,
 * диалог принятия со ставкой), мои доставки (сегменты, кнопки
 * ведения рейса), история с заработком, карточка доставки
 * (таймлайн, действия по ролям) и блок «Доставка» в заказе
 * (форма заявки, карточка активной доставки).
 *
 * API замокан: проверяется рендер и вызовы действий.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Delivery, DeliveryBrief, Role } from '@bazar/types';
import CarrierFeedScreen from '../app/(tabs)/carrier/feed';
import MyDeliveriesScreen from '../app/(tabs)/carrier/my-deliveries';
import HistoryScreen from '../app/(tabs)/carrier/history';
import DeliveryDetailScreen from '../components/screens/DeliveryDetailScreen';
import { OrderDeliveryBlock } from '../components/screens/OrderDeliveryBlock';
import OrderDetailScreen from '../components/screens/OrderDetailScreen';
import { useContextStore } from '../stores/contextStore';

jest.mock('../services/api/deliveryApi', () => ({
  createDelivery: jest.fn(),
  fetchDelivery: jest.fn(),
  completeDelivery: jest.fn(),
  cancelDelivery: jest.fn(),
  fetchCarrierDeliveries: jest.fn(),
  fetchCarrierDelivery: jest.fn(),
  postCarrierDeliveryAction: jest.fn(),
}));

jest.mock('../services/api/orderApi', () => ({
  createOrder: jest.fn(),
  fetchOrders: jest.fn(),
  fetchOrder: jest.fn(),
  cancelOrder: jest.fn(),
}));

jest.mock('expo-router', () => {
  const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
  return {
    __esModule: true,
    router: mockRouter,
    useRouter: () => mockRouter,
    useLocalSearchParams: jest.fn(() => ({ id: 'delivery-1' })),
    usePathname: () => '/',
    useSegments: () => [],
    Link: ({ children }: { children: React.ReactNode }) => children,
    Stack: { Screen: () => null },
    Redirect: jest.fn(() => null),
  };
});

const deliveryApi = jest.requireMock('../services/api/deliveryApi') as {
  createDelivery: jest.Mock;
  fetchDelivery: jest.Mock;
  completeDelivery: jest.Mock;
  cancelDelivery: jest.Mock;
  fetchCarrierDeliveries: jest.Mock;
  fetchCarrierDelivery: jest.Mock;
  postCarrierDeliveryAction: jest.Mock;
};
const orderApi = jest.requireMock('../services/api/orderApi') as {
  fetchOrder: jest.Mock;
  cancelOrder: jest.Mock;
};

const CARRIER = {
  userId: 'u1',
  role: 'carrier' as const,
  organizationId: 'o4',
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

/** Тестовая доставка. */
function makeDelivery(overrides: Partial<Delivery> = {}): Delivery {
  return {
    id: 'delivery-1',
    number: 'DL-2026-000001',
    orderId: 'order-1',
    orderNumber: 'BZ-2026-000001',
    requesterId: 'u-buyer',
    requesterName: 'Мария Петрова',
    carrierId: null,
    carrierName: null,
    status: 'PENDING',
    pickupAddress: 'База Опт-Юг, ул. Шоссейная, 4',
    pickupContact: 'Пётр, +79005550101',
    dropoffAddress: 'ул. Большая Садовая, 101',
    dropoffContact: 'Мария, +79005550202',
    weightKg: 60,
    volumeL: 400,
    cargoNotes: 'Ящики, не кантовать',
    price: null,
    cancelReason: null,
    createdAt: '2026-11-15T08:00:00Z',
    updatedAt: '2026-11-15T08:00:00Z',
    events: [
      {
        id: 'e1',
        type: 'CREATED',
        actorId: 'u-buyer',
        createdAt: '2026-11-15T08:00:00Z',
      },
    ],
    ...overrides,
  };
}

/** Краткая доставка для блока заказа. */
function makeBrief(overrides: Partial<DeliveryBrief> = {}): DeliveryBrief {
  return {
    id: 'delivery-1',
    number: 'DL-2026-000001',
    status: 'IN_TRANSIT',
    carrierName: 'Транс-Логистик',
    dropoffAddress: 'ул. Большая Садовая, 101',
    price: 15000,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.clear();
  useContextStore.setState({
    active: { ...CARRIER },
    memberships: [],
    hydrated: true,
  });
});

// -------------------------------------------------------------------
// Лента перевозчика
// -------------------------------------------------------------------

describe('Лента перевозчика', () => {
  it('карточки заявок с кнопкой принятия', async () => {
    deliveryApi.fetchCarrierDeliveries.mockResolvedValue({
      items: [makeDelivery()],
      total: 1,
      page: 1,
      pageSize: 30,
      hasMore: false,
    });
    const screen = await renderWithQuery(<CarrierFeedScreen />);
    expect(await screen.findByText('DL-2026-000001')).toBeTruthy();
    expect(screen.getByText('Забор')).toBeTruthy();
    expect(screen.getByText('Выгрузка')).toBeTruthy();
    expect(screen.getByText('60 кг · 400 л')).toBeTruthy();
    expect(screen.getByText('Принять заявку')).toBeTruthy();
  });

  it('пусто — осмысленный EmptyState', async () => {
    deliveryApi.fetchCarrierDeliveries.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 30,
      hasMore: false,
    });
    const screen = await renderWithQuery(<CarrierFeedScreen />);
    expect(await screen.findByText('Свободных заявок пока нет')).toBeTruthy();
  });

  it('диалог принятия: ставка уходит в действии', async () => {
    deliveryApi.fetchCarrierDeliveries.mockResolvedValue({
      items: [makeDelivery()],
      total: 1,
      page: 1,
      pageSize: 30,
      hasMore: false,
    });
    deliveryApi.postCarrierDeliveryAction.mockResolvedValue(
      makeDelivery({ status: 'ACCEPTED' }),
    );
    const screen = await renderWithQuery(<CarrierFeedScreen />);
    fireEvent.press(await screen.findByText('Принять заявку'));
    const input = await screen.findByLabelText('Ставка в рублях');
    await fireEvent.changeText(input, '1500');
    // Перезапрос: значение подтверждается в актуальном дереве.
    const typed = await screen.findByLabelText('Ставка в рублях');
    expect(typed.props.value).toBe('1500');
    fireEvent.press(screen.getByText('Принять рейс'));
    await waitFor(() =>
      expect(deliveryApi.postCarrierDeliveryAction).toHaveBeenCalledWith(
        'delivery-1',
        'accept',
        150000,
      ),
    );
  });

  it('принятие без ставки — price не передаётся', async () => {
    deliveryApi.fetchCarrierDeliveries.mockResolvedValue({
      items: [makeDelivery()],
      total: 1,
      page: 1,
      pageSize: 30,
      hasMore: false,
    });
    deliveryApi.postCarrierDeliveryAction.mockResolvedValue(
      makeDelivery({ status: 'ACCEPTED' }),
    );
    const screen = await renderWithQuery(<CarrierFeedScreen />);
    fireEvent.press(await screen.findByText('Принять заявку'));
    fireEvent.press(await screen.findByText('Принять рейс'));
    await waitFor(() =>
      expect(deliveryApi.postCarrierDeliveryAction).toHaveBeenCalledWith(
        'delivery-1',
        'accept',
        undefined,
      ),
    );
  });
});

// -------------------------------------------------------------------
// Мои доставки
// -------------------------------------------------------------------

describe('Мои доставки', () => {
  const active = makeDelivery({ status: 'IN_TRANSIT', price: 15000 });
  const completed = makeDelivery({
    id: 'delivery-2',
    number: 'DL-2026-000002',
    status: 'COMPLETED',
    price: 12000,
  });
  const cancelled = makeDelivery({
    id: 'delivery-3',
    number: 'DL-2026-000003',
    status: 'CANCELLED',
    cancelReason: 'Машина сломалась',
  });

  beforeEach(() => {
    deliveryApi.fetchCarrierDeliveries.mockResolvedValue({
      items: [active, completed, cancelled],
      total: 3,
      page: 1,
      pageSize: 30,
      hasMore: false,
    });
  });

  it('сегмент «Активные»: рейс с кнопкой следующего шага', async () => {
    const screen = await renderWithQuery(<MyDeliveriesScreen />);
    expect(await screen.findByText('DL-2026-000001')).toBeTruthy();
    expect(screen.getByTestId('my-delivery-next-delivery-1')).toBeTruthy();
    // Активный сегмент не показывает завершённые.
    expect(screen.queryByText('DL-2026-000002')).toBeNull();
  });

  it('кнопка шага вызывает действие по рейсу (с подтверждением)', async () => {
    deliveryApi.postCarrierDeliveryAction.mockResolvedValue(
      makeDelivery({ status: 'DELIVERED' }),
    );
    const screen = await renderWithQuery(<MyDeliveriesScreen />);
    // IN_TRANSIT → «Доставил»: финальный шаг страхуется подтверждением.
    fireEvent.press(await screen.findByTestId('my-delivery-next-delivery-1'));
    fireEvent.press(await screen.findByText('Да, доставил'));
    await waitFor(() =>
      expect(deliveryApi.postCarrierDeliveryAction).toHaveBeenCalledWith(
        'delivery-1',
        'delivered',
        undefined,
      ),
    );
  });

  it('«Доставил» можно отменить до подтверждения', async () => {
    deliveryApi.postCarrierDeliveryAction.mockResolvedValue(
      makeDelivery({ status: 'DELIVERED' }),
    );
    const screen = await renderWithQuery(<MyDeliveriesScreen />);
    fireEvent.press(await screen.findByTestId('my-delivery-next-delivery-1'));
    fireEvent.press(await screen.findByText('Ещё в пути'));
    await new Promise((r) => setTimeout(r, 50));
    expect(deliveryApi.postCarrierDeliveryAction).not.toHaveBeenCalled();
  });

  it('сегмент «История»: завершённые и отменённые', async () => {
    const screen = await renderWithQuery(<MyDeliveriesScreen />);
    fireEvent.press(await screen.findByTestId('my-deliveries-segment-history'));
    expect(await screen.findByText('DL-2026-000002')).toBeTruthy();
    expect(screen.getByText('DL-2026-000003')).toBeTruthy();
    expect(screen.queryByText('DL-2026-000001')).toBeNull();
  });
});

// -------------------------------------------------------------------
// История с заработком
// -------------------------------------------------------------------

describe('История перевозчика', () => {
  it('сводка заработка по завершённым рейсам', async () => {
    deliveryApi.fetchCarrierDeliveries.mockResolvedValue({
      items: [
        makeDelivery({ status: 'COMPLETED', price: 15000 }),
        makeDelivery({
          id: 'delivery-2',
          number: 'DL-2026-000002',
          status: 'COMPLETED',
          price: 12000,
        }),
        makeDelivery({
          id: 'delivery-3',
          number: 'DL-2026-000003',
          status: 'CANCELLED',
        }),
      ],
      total: 3,
      page: 1,
      pageSize: 30,
      hasMore: false,
    });
    const screen = await renderWithQuery(<HistoryScreen />);
    expect(await screen.findByText('270 ₽')).toBeTruthy();
    expect(screen.getByText(/2 рейса подтверждено/)).toBeTruthy();
    expect(screen.getByText('DL-2026-000003')).toBeTruthy();
  });

  it('пусто — EmptyState', async () => {
    deliveryApi.fetchCarrierDeliveries.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 30,
      hasMore: false,
    });
    const screen = await renderWithQuery(<HistoryScreen />);
    expect(await screen.findByText('История доставок пуста')).toBeTruthy();
  });
});

// -------------------------------------------------------------------
// Карточка доставки
// -------------------------------------------------------------------

describe('Карточка доставки', () => {
  it('перевозчик: таймлайн, маршрут и действия по статусу', async () => {
    deliveryApi.fetchCarrierDelivery.mockResolvedValue(
      makeDelivery({
        status: 'ACCEPTED',
        carrierName: 'Транс-Логистик',
        price: 15000,
      }),
    );
    const screen = await renderWithQuery(
      <DeliveryDetailScreen role="carrier" deliveryId="delivery-1" />,
    );
    expect(await screen.findByTestId('delivery-timeline')).toBeTruthy();
    expect(screen.getByText('Маршрут')).toBeTruthy();
    expect(screen.getByText('Пётр, +79005550101')).toBeTruthy();
    expect(screen.getByText('150 ₽')).toBeTruthy();
    expect(screen.getByTestId('delivery-primary-action')).toBeTruthy();
    expect(screen.getByText('Отменить рейс')).toBeTruthy();
  });

  it('перевозчик: PENDING — принять через диалог со ставкой', async () => {
    deliveryApi.fetchCarrierDelivery.mockResolvedValue(makeDelivery());
    deliveryApi.postCarrierDeliveryAction.mockResolvedValue(
      makeDelivery({ status: 'ACCEPTED' }),
    );
    const screen = await renderWithQuery(
      <DeliveryDetailScreen role="carrier" deliveryId="delivery-1" />,
    );
    fireEvent.press(await screen.findByText('Принять заявку'));
    await fireEvent.changeText(
      await screen.findByLabelText('Ставка в рублях'),
      '900',
    );
    const typed = await screen.findByLabelText('Ставка в рублях');
    expect(typed.props.value).toBe('900');
    fireEvent.press(screen.getByTestId('delivery-accept-confirm'));
    await waitFor(() =>
      expect(deliveryApi.postCarrierDeliveryAction).toHaveBeenCalledWith(
        'delivery-1',
        'accept',
        90000,
      ),
    );
  });

  it('перевозчик: DELIVERED — ждёт подтверждения, кнопок нет', async () => {
    deliveryApi.fetchCarrierDelivery.mockResolvedValue(
      makeDelivery({ status: 'DELIVERED' }),
    );
    const screen = await renderWithQuery(
      <DeliveryDetailScreen role="carrier" deliveryId="delivery-1" />,
    );
    expect(
      await screen.findByText(/Дождитесь подтверждения получателя/),
    ).toBeTruthy();
    expect(screen.queryByTestId('delivery-primary-action')).toBeNull();
    expect(screen.queryByTestId('delivery-cancel')).toBeNull();
  });

  it('покупатель: DELIVERED — кнопка подтверждения получения', async () => {
    useContextStore.setState({
      active: { ...CUSTOMER },
      memberships: [],
      hydrated: true,
    });
    deliveryApi.fetchDelivery.mockResolvedValue(
      makeDelivery({ status: 'DELIVERED' }),
    );
    deliveryApi.completeDelivery.mockResolvedValue(
      makeDelivery({ status: 'COMPLETED' }),
    );
    const screen = await renderWithQuery(
      <DeliveryDetailScreen role="customer" deliveryId="delivery-1" />,
    );
    fireEvent.press(await screen.findByText('Подтвердить получение'));
    await waitFor(() =>
      expect(deliveryApi.completeDelivery).toHaveBeenCalledWith('delivery-1'),
    );
  });

  it('отмена с причиной: кнопка недоступна без текста', async () => {
    deliveryApi.fetchCarrierDelivery.mockResolvedValue(
      makeDelivery({ status: 'ACCEPTED' }),
    );
    deliveryApi.cancelDelivery.mockResolvedValue(
      makeDelivery({ status: 'CANCELLED' }),
    );
    const screen = await renderWithQuery(
      <DeliveryDetailScreen role="carrier" deliveryId="delivery-1" />,
    );
    fireEvent.press(await screen.findByText('Отменить рейс'));
    const confirm = await screen.findByTestId('delivery-cancel-confirm');
    expect(confirm.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.changeText(
      await screen.findByLabelText('Причина отмены'),
      'Машина сломалась',
    );
    const typed = await screen.findByLabelText('Причина отмены');
    expect(typed.props.value).toBe('Машина сломалась');
    await waitFor(() =>
      expect(confirm.props.accessibilityState?.disabled).toBe(false),
    );
    fireEvent.press(confirm);
    await waitFor(() =>
      expect(deliveryApi.cancelDelivery).toHaveBeenCalledWith(
        'delivery-1',
        'Машина сломалась',
      ),
    );
  });

  it('отменённая доставка показывает причину', async () => {
    deliveryApi.fetchCarrierDelivery.mockResolvedValue(
      makeDelivery({ status: 'CANCELLED', cancelReason: 'Передумали' }),
    );
    const screen = await renderWithQuery(
      <DeliveryDetailScreen role="carrier" deliveryId="delivery-1" />,
    );
    expect(await screen.findByText('Причина отмены')).toBeTruthy();
    expect(screen.getByText('Передумали')).toBeTruthy();
  });
});

// -------------------------------------------------------------------
// Блок «Доставка» в карточке заказа
// -------------------------------------------------------------------

describe('Блок доставки в заказе', () => {
  it('подтверждённый заказ без доставки — форма заявки', async () => {
    const screen = await renderWithQuery(
      <OrderDeliveryBlock
        orderId="order-1"
        orderStatus="CONFIRMED"
        delivery={null}
        basePath="customer"
      />,
    );
    expect(screen.getByText('Заказать доставку')).toBeTruthy();
    fireEvent.press(screen.getByTestId('order-delivery-create'));

    await fireEvent.changeText(
      await screen.findByLabelText('Адрес забора'),
      'База Опт-Юг, ул. Шоссейная, 4',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Контакт на заборе'),
      'Пётр, +79005550101',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Адрес выгрузки'),
      'ул. Большая Садовая, 101',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Контакт на выгрузке'),
      'Мария, +79005550202',
    );
    await fireEvent.changeText(screen.getByLabelText('Вес, кг'), '60');
    await fireEvent.changeText(screen.getByLabelText('Объём, л'), '400');

    deliveryApi.createDelivery.mockResolvedValue(makeDelivery());
    fireEvent.press(await screen.findByTestId('order-delivery-submit'));
    await waitFor(() =>
      expect(deliveryApi.createDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          pickupAddress: 'База Опт-Юг, ул. Шоссейная, 4',
          weightKg: 60,
          volumeL: 400,
        }),
      ),
    );
  });

  it('неподтверждённый заказ — подсказка вместо формы', async () => {
    const screen = await renderWithQuery(
      <OrderDeliveryBlock
        orderId="order-1"
        orderStatus="PENDING"
        delivery={null}
        basePath="customer"
      />,
    );
    expect(
      screen.getByText('Станет доступна, когда продавец подтвердит заказ.'),
    ).toBeTruthy();
    expect(screen.queryByText('Заказать доставку')).toBeNull();
  });

  it('активная доставка — карточка со ссылкой на детали', async () => {
    const screen = await renderWithQuery(
      <OrderDeliveryBlock
        orderId="order-1"
        orderStatus="CONFIRMED"
        delivery={makeBrief()}
        basePath="customer"
      />,
    );
    expect(screen.getByText('Доставка DL-2026-000001')).toBeTruthy();
    expect(screen.getByText('Транс-Логистик')).toBeTruthy();
    expect(screen.getByText(/Подробности маршрута/)).toBeTruthy();
  });

  it('в карточке заказа покупателя блок между получением и комментарием', async () => {
    useContextStore.setState({
      active: { ...CUSTOMER },
      memberships: [],
      hydrated: true,
    });
    orderApi.fetchOrder.mockResolvedValue({
      id: 'order-1',
      number: 'BZ-2026-000001',
      status: 'CONFIRMED',
      subtotal: 189000,
      deliveryCost: 0,
      total: 189000,
      address: null,
      comment: 'Позвонить за час',
      createdAt: '2026-11-15T08:00:00Z',
      updatedAt: '2026-11-15T08:00:00Z',
      seller: { id: 's1', name: 'Опт-Юг' },
      items: [],
      events: [],
      delivery: makeBrief(),
    });
    const screen = await renderWithQuery(
      <OrderDetailScreen basePath="customer" orderId="order-1" />,
    );
    expect(await screen.findByTestId('order-timeline')).toBeTruthy();
    expect(screen.getByText('Доставка DL-2026-000001')).toBeTruthy();
    expect(screen.getByText('Комментарий')).toBeTruthy();
  });
});

/** Роль для типизации (не используется напрямую в тестах). */
void ({} as Role);
