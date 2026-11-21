/**
 * Тесты экрана аналитики продавца — AI Layer 1 (Промт 18, D):
 * данные, скелетоны, empty, error+retry.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type {
  ActiveUsersResponse,
  AnomaliesResponse,
  PriceTrendsResponse,
  VolumesResponse,
} from '@bazar/types';
import { AnalyticsScreen } from '../components/screens/AnalyticsScreen';
import * as marketApi from '../services/api/marketApi';

const trendsMock = jest.spyOn(marketApi, 'fetchPriceTrends');
const volumesMock = jest.spyOn(marketApi, 'fetchVolumeTrends');
const usersMock = jest.spyOn(marketApi, 'fetchActiveUsers');
const anomaliesMock = jest.spyOn(marketApi, 'fetchAnomalies');

async function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AnalyticsScreen />
    </QueryClientProvider>,
  );
}

const TRENDS: PriceTrendsResponse = {
  period: 'week',
  items: [
    {
      categoryId: 'c1',
      categoryName: 'Овощи',
      avgPriceKopecks: 8500,
      offers: 6,
      changePercent: 12.5,
    },
    {
      categoryId: 'c2',
      categoryName: 'Фрукты',
      avgPriceKopecks: 12_000,
      offers: 4,
      changePercent: null,
    },
  ],
};

const VOLUMES: VolumesResponse = {
  period: 'week',
  items: [
    {
      productId: 'p1',
      productName: 'Помидоры',
      unit: 'кг',
      quantity: 150,
      ordersCount: 6,
      changePercent: 50,
    },
  ],
};

const USERS = { period: 'week', items: [], total: 0 };

const ANOMALIES: AnomaliesResponse = {
  period: 'week',
  items: [
    {
      type: 'price_spike',
      entity: 'Овощи',
      value: 12_000,
      zScore: 2.4,
    },
  ],
};

function mockAll(overrides?: {
  trends?: Promise<PriceTrendsResponse>;
  volumes?: Promise<VolumesResponse>;
  users?: Promise<ActiveUsersResponse>;
  anomalies?: Promise<AnomaliesResponse>;
}) {
  const responses = {
    trends: Promise.resolve(TRENDS),
    volumes: Promise.resolve(VOLUMES),
    users: Promise.resolve(USERS),
    anomalies: Promise.resolve(ANOMALIES),
    ...overrides,
  };
  trendsMock.mockReturnValue(responses.trends as never);
  volumesMock.mockReturnValue(responses.volumes as never);
  usersMock.mockReturnValue(responses.users as never);
  anomaliesMock.mockReturnValue(responses.anomalies as never);
}

describe('AnalyticsScreen', () => {
  beforeEach(() => {
    trendsMock.mockReset();
    volumesMock.mockReset();
    usersMock.mockReset();
    anomaliesMock.mockReset();
  });

  it('показывает секции с данными Layer 0', async () => {
    mockAll();
    const screen = await renderScreen();

    expect(await screen.findByText('Тренды цен')).toBeTruthy();
    expect(screen.getAllByText('Овощи').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('85 ₽')).toBeTruthy();
    expect(screen.getByText('+12,5%')).toBeTruthy();
    expect(screen.getByText('Объёмы продаж')).toBeTruthy();
    expect(screen.getAllByText('150 кг').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Топ-товары')).toBeTruthy();
    expect(screen.getByText('Аномалии')).toBeTruthy();
    expect(screen.getByText(/120 ₽ · отклонение 2,4σ/)).toBeTruthy();
  });

  it('empty: нет данных — подсказка про заказы', async () => {
    mockAll({
      trends: Promise.resolve({ period: 'week', items: [] }),
      volumes: Promise.resolve({ period: 'week', items: [] }),
    });
    const screen = await renderScreen();

    expect(await screen.findByText('Пока нет данных')).toBeTruthy();
    expect(
      screen.getByText(/Продажи появятся, когда будут заказы/),
    ).toBeTruthy();
  });

  it('error: ошибка загрузки трендов — retry перезапрашивает', async () => {
    trendsMock.mockRejectedValueOnce(new Error('network'));
    volumesMock.mockResolvedValue({
      period: 'week',
      items: VOLUMES.items,
    } as never);
    usersMock.mockResolvedValue(USERS as never);
    anomaliesMock.mockResolvedValue({ period: 'week', items: [] } as never);
    const screen = await renderScreen();

    expect(await screen.findByText('Не удалось загрузить тренды')).toBeTruthy();

    trendsMock.mockResolvedValue(TRENDS as never);
    fireEvent.press(screen.getByText('Повторить'));
    await waitFor(() => {
      expect(screen.getByText('Овощи')).toBeTruthy();
    });
  });

  it('периоды: переключение на «Месяц» меняет запросы', async () => {
    mockAll();
    const screen = await renderScreen();
    await screen.findByText('Тренды цен');

    fireEvent.press(screen.getByText('Месяц'));
    await waitFor(() => {
      expect(trendsMock).toHaveBeenLastCalledWith('month');
      expect(volumesMock).toHaveBeenLastCalledWith('month');
    });
  });
});
