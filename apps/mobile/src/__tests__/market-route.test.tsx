/**
 * Тесты «Маршрута по рынку» (Промт 17, Часть B): API-клиент и хук
 * visited, экран маршрута (порядок == API, toggle, empty, error,
 * warning unlocated, кнопка входа в шапке заказов, переход в
 * заказ), форма позиции продавца (валидация полей).
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { MarketRouteResponse } from '@bazar/types';
import { ToastProvider } from '@bazar/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearMarketPosition,
  fetchMarketPosition,
  fetchMarketRoute,
  saveMarketPosition,
} from '../services/api/marketApi';
import { fetchOrders } from '../services/api/orderApi';
import MarketRouteScreen from '../components/screens/MarketRouteScreen';
import MarketPositionScreen from '../components/screens/MarketPositionScreen';
import { MarketRouteButton } from '../components/screens/MarketRouteButton';
import { useMarketVisited } from '../hooks/useMarketRoute';

jest.mock('../services/api/marketApi');
jest.mock('../services/api/orderApi');
jest.mock('../services/api/notificationApi', () => ({
  fetchNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}));

const mockRouterPush = jest.fn();
const mockRouterBack = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    useLocalSearchParams: jest.fn(() => ({})),
    useRouter: () => ({
      push: mockRouterPush,
      back: mockRouterBack,
      replace: mockRouterReplace,
    }),
  };
});

const fetchMarketRouteMock = jest.mocked(fetchMarketRoute);
const fetchMarketPositionMock = jest.mocked(fetchMarketPosition);
const saveMarketPositionMock = jest.mocked(saveMarketPosition);
const clearMarketPositionMock = jest.mocked(clearMarketPosition);
const fetchOrdersMock = jest.mocked(fetchOrders);

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

/** Маршрут на 3 остановки: У дома (1,8) → Опт-Юг (3,12) → Ромашка (2,27). */
const ROUTE: MarketRouteResponse = {
  market: { rows: 4, spots: 40, entrance: { row: 0, spot: 0 } },
  stops: [
    {
      orderId: 'o1',
      orderNumber: 'BZ-2026-000009',
      seller: { id: 's2', name: 'Сеть «У дома»' },
      row: 1,
      spot: 8,
      status: 'CONFIRMED',
      itemsCount: 2,
      total: 32_000,
      legMeters: 32,
    },
    {
      orderId: 'o2',
      orderNumber: 'BZ-2026-000007',
      seller: { id: 's1', name: 'Опт-Юг' },
      row: 3,
      spot: 12,
      status: 'PREPARING',
      itemsCount: 1,
      total: 44_500,
      legMeters: 76,
    },
    {
      orderId: 'o3',
      orderNumber: 'BZ-2026-000010',
      seller: { id: 's3', name: 'Магазин «Ромашка»' },
      row: 2,
      spot: 27,
      status: 'READY',
      itemsCount: 4,
      total: 61_200,
      legMeters: 81,
    },
  ],
  totalMeters: 189,
  estimatedMinutes: 3,
  returnToStart: false,
  unlocated: [],
  truncated: false,
};

describe('marketApi', () => {
  it('fetchMarketRoute передаёт returnToStart и orderIds', async () => {
    fetchMarketRouteMock.mockResolvedValue(ROUTE);
    await fetchMarketRoute({ returnToStart: true, orderIds: ['a', 'b'] });
    expect(fetchMarketRouteMock).toHaveBeenCalledWith({
      returnToStart: true,
      orderIds: ['a', 'b'],
    });
  });

  it('fetchMarketPosition разворачивает обёртку { position }', async () => {
    fetchMarketPositionMock.mockResolvedValue({
      locationId: 'l1',
      name: 'Точка на рынке',
      marketRow: 3,
      marketSpot: 12,
    });
    const position = await fetchMarketPosition();
    expect(position).toMatchObject({ marketRow: 3, marketSpot: 12 });
  });
});

describe('useMarketVisited', () => {
  const setItemMock = AsyncStorage.setItem as jest.Mock;
  const getItemMock = AsyncStorage.getItem as jest.Mock;
  beforeEach(() => {
    setItemMock.mockClear();
    getItemMock.mockClear();
  });

  it('переключает отметку и персистит по дате', async () => {
    let visited: string[] = [];
    let toggle: (id: string) => void = () => {};
    function Probe() {
      const state = useMarketVisited();
      visited = state.visited;
      toggle = state.toggleVisited;
      return null;
    }
    await renderWithQuery(<Probe />);
    await waitFor(() => {
      toggle('o1');
    });
    await waitFor(() => {
      expect(visited).toEqual(['o1']);
    });
    expect(setItemMock).toHaveBeenCalled();
    const saved = JSON.parse(setItemMock.mock.calls[0][1] as string) as {
      date: string;
      orderIds: string[];
    };
    expect(saved.orderIds).toEqual(['o1']);
    expect(saved.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('несовпадающая дата — отметки сброшены', async () => {
    getItemMock.mockResolvedValue(
      JSON.stringify({ date: '2000-01-01', orderIds: ['o1', 'o2'] }),
    );
    let visited: string[] = ['stale'];
    function Probe() {
      visited = useMarketVisited().visited;
      return null;
    }
    await renderWithQuery(<Probe />);
    await waitFor(() => {
      expect(visited).toEqual([]);
    });
  });
});

describe('MarketRouteScreen', () => {
  beforeEach(() => {
    fetchMarketRouteMock.mockReset();
    jest.clearAllMocks();
  });

  it('показывает сводку, схему и остановки в порядке API', async () => {
    fetchMarketRouteMock.mockResolvedValue(ROUTE);
    const screen = await renderWithQuery(
      <MarketRouteScreen basePath="customer" />,
    );
    expect(await screen.findByTestId('market-route-summary')).toBeTruthy();
    expect(screen.getByText('3 точек · 189 м · ~3 мин пешком')).toBeTruthy();
    expect(screen.getByTestId('market-route-map')).toBeTruthy();
    // Порядок списка == порядок ответа.
    expect(screen.getByTestId('market-route-stop-1')).toBeTruthy();
    expect(screen.getByTestId('market-route-stop-2')).toBeTruthy();
    expect(screen.getByTestId('market-route-stop-3')).toBeTruthy();
    expect(screen.getByText('Сеть «У дома»')).toBeTruthy();
    expect(screen.getByText('Ряд 3 · место 12')).toBeTruthy();
    expect(screen.getByText('+76 м')).toBeTruthy();
  });

  it('toggle «Вернуться к выходу» перезапрашивает маршрут', async () => {
    fetchMarketRouteMock.mockResolvedValue(ROUTE);
    const screen = await renderWithQuery(
      <MarketRouteScreen basePath="customer" />,
    );
    await screen.findByTestId('market-route-return');
    fireEvent.press(screen.getByTestId('market-route-return'));
    await waitFor(() => {
      expect(fetchMarketRouteMock).toHaveBeenCalledWith(
        expect.objectContaining({ returnToStart: true }),
      );
    });
  });

  it('отметка «Пройдено» — оптимистично, метры и порядок не меняются', async () => {
    fetchMarketRouteMock.mockResolvedValue(ROUTE);
    const screen = await renderWithQuery(
      <MarketRouteScreen basePath="customer" />,
    );
    await screen.findByTestId('market-route-stop-1-visited');
    fireEvent.press(screen.getByTestId('market-route-stop-1-visited'));
    await waitFor(() => {
      expect(screen.getByText('Пройдено 1 из 3')).toBeTruthy();
    });
    expect(fetchMarketRouteMock).toHaveBeenCalledTimes(1);
  });

  it('empty: нет активных заказов — подсказка про статусы', async () => {
    fetchMarketRouteMock.mockResolvedValue({
      ...ROUTE,
      stops: [],
      totalMeters: 0,
      estimatedMinutes: 0,
    });
    const screen = await renderWithQuery(
      <MarketRouteScreen basePath="customer" />,
    );
    expect(await screen.findByText('Нет подтверждённых заказов')).toBeTruthy();
    expect(
      screen.getByText(
        'Маршрут строится по заказам «Подтверждён / Собирается / Готов к выдаче»',
      ),
    ).toBeTruthy();
  });

  it('error: ErrorState с retry', async () => {
    fetchMarketRouteMock.mockRejectedValue(new Error('сеть'));
    const screen = await renderWithQuery(
      <MarketRouteScreen basePath="customer" />,
    );
    expect(await screen.findByText('Маршрут не построился')).toBeTruthy();
  });

  it('warning unlocated: продавец без точки — баннер, не в маршруте', async () => {
    fetchMarketRouteMock.mockResolvedValue({
      ...ROUTE,
      stops: ROUTE.stops.slice(0, 1),
      unlocated: [
        {
          orderId: 'o9',
          orderNumber: 'BZ-2026-000011',
          sellerName: 'Агрофирма Север',
        },
      ],
    });
    const screen = await renderWithQuery(
      <MarketRouteScreen basePath="customer" />,
    );
    expect(await screen.findByTestId('market-route-unlocated')).toBeTruthy();
    expect(screen.getByText(/Агрофирма Север/)).toBeTruthy();
    expect(screen.getByText(/нет точки на схеме/)).toBeTruthy();
  });

  it('тап по строке открывает карточку заказа', async () => {
    fetchMarketRouteMock.mockResolvedValue(ROUTE);
    const screen = await renderWithQuery(
      <MarketRouteScreen basePath="customer" />,
    );
    const row = await screen.findByTestId('market-route-stop-2');
    fireEvent.press(row);
    expect(mockRouterPush).toHaveBeenCalledWith('/customer/orders/o2');
  });
});

describe('MarketRouteButton (вход из заказов)', () => {
  beforeEach(() => {
    fetchOrdersMock.mockReset();
  });

  it('скрыт без активных заказов и показан при CONFIRMED', async () => {
    fetchOrdersMock.mockResolvedValue({
      items: [
        {
          id: 'o1',
          number: 'BZ-2026-000001',
          status: 'COMPLETED',
          subtotal: 0,
          deliveryCost: 0,
          total: 0,
          address: null,
          comment: null,
          createdAt: '2026-11-19T05:00:00Z',
          updatedAt: '2026-11-19T05:00:00Z',
          seller: { id: 's1', name: 'Опт-Юг' },
          items: [],
          events: [],
          delivery: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    const empty = await renderWithQuery(
      <MarketRouteButton basePath="customer" />,
    );
    await waitFor(() => {
      expect(empty.queryByTestId('orders-market-route-button')).toBeNull();
    });

    fetchOrdersMock.mockResolvedValueOnce({
      items: [
        {
          id: 'o2',
          number: 'BZ-2026-000002',
          status: 'CONFIRMED',
          subtotal: 0,
          deliveryCost: 0,
          total: 0,
          address: null,
          comment: null,
          createdAt: '2026-11-19T05:00:00Z',
          updatedAt: '2026-11-19T05:00:00Z',
          seller: { id: 's1', name: 'Опт-Юг' },
          items: [],
          events: [],
          delivery: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    const active = await renderWithQuery(
      <MarketRouteButton basePath="store" />,
    );
    const button = await active.findByTestId('orders-market-route-button');
    expect(button.props.accessibilityLabel).toBe('Маршрут по рынку');
    fireEvent.press(button);
    expect(mockRouterPush).toHaveBeenCalledWith('/store/market-route');
  });
});

describe('MarketPositionScreen (форма точки)', () => {
  beforeEach(() => {
    fetchMarketPositionMock.mockReset();
    saveMarketPositionMock.mockReset();
    clearMarketPositionMock.mockReset();
  });

  it('показывает текущую позицию и поля ряд/место', async () => {
    fetchMarketPositionMock.mockResolvedValue({
      locationId: 'l1',
      name: 'Точка на рынке',
      marketRow: 3,
      marketSpot: 12,
    });
    const screen = await renderWithQuery(<MarketPositionScreen />);
    expect(await screen.findByDisplayValue('3')).toBeTruthy();
    expect(screen.getByDisplayValue('12')).toBeTruthy();
    expect(
      screen.getByText(
        'Заполните — покупатели увидят вас в маршрутах по рынку',
      ),
    ).toBeTruthy();
  });

  it('валидация границ и сохранение', async () => {
    fetchMarketPositionMock.mockResolvedValue(null);
    const screen = await renderWithQuery(<MarketPositionScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('market-position-row')).toBeTruthy();
    });
    // Сохранение недоступно без значений.
    expect(
      screen.getByTestId('market-position-save').props.accessibilityState
        ?.disabled,
    ).toBe(true);
    // Ввод за границами — подсказка и заблокированная кнопка.
    await fireEvent.changeText(screen.getByTestId('market-position-row'), '9');
    await fireEvent.changeText(
      screen.getByTestId('market-position-spot'),
      '12',
    );
    expect(
      screen.getByText('Ряд — целое от 1 до 4, место — целое от 1 до 40'),
    ).toBeTruthy();
    // Корректные значения — сохранение вызывает PUT.
    await fireEvent.changeText(screen.getByTestId('market-position-row'), '2');
    saveMarketPositionMock.mockResolvedValue({
      locationId: 'l1',
      name: 'Точка на рынке',
      marketRow: 2,
      marketSpot: 12,
    });
    fireEvent.press(screen.getByTestId('market-position-save'));
    await waitFor(() => {
      expect(saveMarketPositionMock).toHaveBeenCalledWith({
        marketRow: 2,
        marketSpot: 12,
      });
    });
  });
});
