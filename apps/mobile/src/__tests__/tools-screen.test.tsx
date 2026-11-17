/**
 * Тесты экрана «Все инструменты» (Промт 12, Часть D): группы,
 * поиск по подстроке, переход по разделу, бейдж уведомлений,
 * заглушки навигации.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToolsScreen } from '../components/shell/ToolsScreen';
import { useAuthStore, __resetAuthStoreForTests } from '../stores/authStore';
import { useContextStore } from '../stores/contextStore';

jest.mock('../services/api/notificationApi', () => ({
  fetchNotifications: jest.fn(),
  fetchUnreadCount: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}));

const notificationApi = jest.requireMock('../services/api/notificationApi') as {
  fetchUnreadCount: jest.Mock;
};

const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  __esModule: true,
  router: mockRouter,
  useRouter: () => mockRouter,
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: () => '/',
  useSegments: () => [],
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
}));

async function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    // gcTime 0 — без таймеров сборки, иначе jest не завершается.
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
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
    active: {
      userId: 'u1',
      role: 'wholesale_seller' as const,
      organizationId: 'org-1',
      locationId: null,
    },
    memberships: [],
    hydrated: true,
  });
  notificationApi.fetchUnreadCount.mockResolvedValue(3);
  return AsyncStorage.clear();
});

describe('ToolsScreen (Все инструменты, оптовик)', () => {
  it('показывает группы и разделы', async () => {
    const { screen } = await renderWithQuery(
      <ToolsScreen role="wholesale_seller" />,
    );
    // Группы: названия могут совпадать с разделами — проверяем наличие.
    expect(await screen.findAllByText('Торговля')).toBeTruthy();
    expect(screen.getAllByText('Склад').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Клиенты').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Финансы').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Аккаунт')).toBeTruthy();
    // Разделы — по уникальным testID. Товары/Предложения/Заказы —
    // таб-бар, в «Инструментах» не дублируются (VLM-аудит, итерация 3).
    expect(screen.queryByTestId('tools-item-products')).toBeNull();
    expect(screen.queryByTestId('tools-item-offers')).toBeNull();
    expect(screen.queryByTestId('tools-item-orders')).toBeNull();
    expect(screen.getByTestId('tools-item-requests')).toBeTruthy();
    expect(screen.getByTestId('tools-item-stock')).toBeTruthy();
    expect(screen.getByTestId('tools-item-stock-locations')).toBeTruthy();
    expect(screen.getByTestId('tools-item-movements')).toBeTruthy();
    expect(screen.getByTestId('tools-item-notes')).toBeTruthy();
    expect(screen.getByTestId('tools-item-debts')).toBeTruthy();
    expect(screen.getByTestId('tools-item-analytics')).toBeTruthy();
    expect(screen.getByTestId('tools-item-organization')).toBeTruthy();
    expect(screen.getByTestId('tools-item-staff')).toBeTruthy();
    expect(screen.getByTestId('tools-item-notifications')).toBeTruthy();
    expect(screen.getByTestId('tools-item-profile')).toBeTruthy();
    expect(screen.getByTestId('tools-item-settings')).toBeTruthy();
  });

  it('поиск фильтрует разделы по подстроке', async () => {
    const { screen } = await renderWithQuery(
      <ToolsScreen role="wholesale_seller" />,
    );
    await screen.findAllByText('Торговля');
    await fireEvent.changeText(screen.getByTestId('tools-search'), 'склад');
    await waitFor(() => {
      // Группа «Склад» с разделами осталась…
      expect(screen.getByTestId('tools-item-stock')).toBeTruthy();
      expect(screen.getByTestId('tools-item-stock-locations')).toBeTruthy();
      // …остальные группы скрыты.
      expect(screen.queryByTestId('tools-item-products')).toBeNull();
      expect(screen.queryByTestId('tools-item-profile')).toBeNull();
    });
  });

  it('поиск без результатов — осмысленное пустое состояние', async () => {
    const { screen } = await renderWithQuery(
      <ToolsScreen role="wholesale_seller" />,
    );
    await screen.findAllByText('Торговля');
    await fireEvent.changeText(
      screen.getByTestId('tools-search'),
      'кракозябра',
    );
    await waitFor(() => {
      expect(screen.getByText('Раздел не найден')).toBeTruthy();
    });
  });

  it('тап по разделу ведёт на его маршрут', async () => {
    const { screen } = await renderWithQuery(
      <ToolsScreen role="wholesale_seller" />,
    );
    await screen.findAllByText('Торговля');
    await fireEvent.press(screen.getByTestId('tools-item-stock'));
    expect(mockRouter.push).toHaveBeenCalledWith('/wholesale/stock');
  });

  it('бейдж непрочитанных уведомлений на разделе «Уведомления»', async () => {
    const { screen } = await renderWithQuery(
      <ToolsScreen role="wholesale_seller" />,
    );
    await screen.findAllByText('Аккаунт');
    await waitFor(() => {
      expect(screen.getByText('3')).toBeTruthy();
    });
  });

  it('экран владельца точки показывает свои группы', async () => {
    const { screen } = await renderWithQuery(
      <ToolsScreen role="store_owner" />,
    );
    expect(await screen.findAllByText('Рабочие записи')).toBeTruthy();
    // «Витрина» — только вкладка таб-бара: в «Инструментах" не
    // дублируется (VLM-аудит, итерация 3).
    expect(screen.getAllByText('Витрина').length).toBe(1);
    expect(screen.getByText('Долги')).toBeTruthy();
    expect(screen.getByText('Заметки')).toBeTruthy();
  });
});
