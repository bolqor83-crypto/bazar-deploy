/**
 * Тесты онбординга-заглушки: показывается аутентифицированному
 * без организаций, «Продолжить» ведёт в приложение.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Redirect, router } from 'expo-router';
import { __resetAuthStoreForTests, useAuthStore } from '../stores/authStore';
import { useContextStore } from '../stores/contextStore';
import WelcomeScreen from '../app/(auth)/welcome';

jest.mock('../services/authMock');

const NEWBIE = {
  id: 'u2',
  phone: '+79001112233',
  name: 'Мария Иванова',
  createdAt: '2026-01-02T00:00:00.000Z',
  memberships: [],
};

const IVAN_WITH_ORGS = {
  id: 'u1',
  phone: '+79001234567',
  name: 'Иван Петров',
  createdAt: '2026-01-01T00:00:00.000Z',
  memberships: [
    {
      userId: 'u1',
      organizationId: 'o1',
      role: 'wholesale_seller' as const,
      title: 'Владелец',
    },
  ],
};

describe('(auth)/welcome', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    jest.clearAllMocks();
    jest.mocked(router.replace).mockClear();
    jest.mocked(Redirect).mockClear();
    useContextStore.setState({
      active: {
        userId: '',
        role: 'customer',
        organizationId: null,
        locationId: null,
      },
      memberships: [],
      hydrated: true,
    });
  });

  it('гость → редирект на /login', async () => {
    useAuthStore.setState({ state: 'unauthenticated', user: null });
    await render(<WelcomeScreen />);
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/login' },
      undefined,
    );
  });

  it('пользователь с организациями → редирект на /(tabs)', async () => {
    useAuthStore.setState({ state: 'authenticated', user: IVAN_WITH_ORGS });
    await render(<WelcomeScreen />);
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/(tabs)' },
      undefined,
    );
  });

  it('показывается пользователю без организаций', async () => {
    useAuthStore.setState({ state: 'authenticated', user: NEWBIE });
    const screen = await render(<WelcomeScreen />);
    expect(screen.getByText('Добро пожаловать в Bazar')).toBeTruthy();
    expect(
      screen.getByText(
        'Расскажите о своей сфере: магазин, опт или доставка. Настройка займёт пару минут.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Продолжить')).toBeTruthy();
  });

  it('«Продолжить» → customer-контекст и редирект в (tabs)', async () => {
    useAuthStore.setState({ state: 'authenticated', user: NEWBIE });
    // Реальный поток: register уже синхронизировал контекст (u2/customer)
    useContextStore.setState({
      active: {
        userId: 'u2',
        role: 'customer',
        organizationId: null,
        locationId: null,
      },
      memberships: [],
      hydrated: true,
    });
    const screen = await render(<WelcomeScreen />);

    await fireEvent.press(screen.getByText('Продолжить'));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
    const { active } = useContextStore.getState();
    expect(active.role).toBe('customer');
    expect(active.userId).toBe('u2');
  });

  it('пока состояние unknown — ничего не рендерит', async () => {
    useAuthStore.setState({ state: 'unknown', user: null });
    const screen = await render(<WelcomeScreen />);
    expect(screen.queryByText('Добро пожаловать в Bazar')).toBeNull();
    expect(screen.toJSON()).toBeNull();
  });
});
