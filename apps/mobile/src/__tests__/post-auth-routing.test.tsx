/**
 * Регрессионные тесты Бага №2 (Промт 6, Часть A).
 *
 * До фикса: после register/login/loginWithOtp пользователь без членств
 * попадал в /(tabs): AuthGuard гостевой зоны реагировал на state
 * 'authenticated' редиректом в приложение раньше, чем экран успевал
 * выполнить свой router.replace('/welcome').
 *
 * После фикса: guard — единственный маршрутизатор; без членств →
 * /welcome, с членствами → /(tabs). Тесты проходят полный путь:
 * реальный authStore + мок authMockService, затем рендер AuthGuard
 * гостевой зоны (как это делает (auth)/_layout).
 */
import { render } from '@testing-library/react-native';
import { Redirect } from 'expo-router';
import { Text } from '@bazar/ui';
import type { AuthUser, Session } from '@bazar/types';
import { authMockService } from '../services/authMock';
import { AuthGuard } from '../components/guards/AuthGuard';
import { __resetAuthStoreForTests, useAuthStore } from '../stores/authStore';
import { useContextStore } from '../stores/contextStore';

jest.mock('../services/authMock');

const NEWBIE: AuthUser = {
  id: 'u9',
  phone: '+79005556677',
  name: 'Мария Иванова',
  createdAt: '2026-01-02T00:00:00.000Z',
  memberships: [],
};

const SESSION: Session = {
  userId: 'u9',
  token: 'token-u9',
  issuedAt: '2026-01-02T00:00:00.000Z',
  expiresAt: '2026-01-09T00:00:00.000Z',
};

/** Guard гостевой зоны — так оборачивает экраны (auth)/_layout. */
function renderGuestZoneGuard() {
  return render(
    <AuthGuard requireAuth={false}>
      <Text>Экран входа</Text>
    </AuthGuard>,
  );
}

describe('пост-аутентификационная маршрутизация (Баг №2)', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    jest.clearAllMocks();
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

  it('регистрация без членств → /welcome, а не /(tabs)', async () => {
    jest
      .mocked(authMockService.register)
      .mockResolvedValue({ user: NEWBIE, session: SESSION });

    const ok = await useAuthStore.getState().register({
      name: 'Мария Иванова',
      phone: '+79005556677',
      password: 'password1',
    });
    expect(ok).toBe(true);

    await renderGuestZoneGuard();
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/welcome' },
      undefined,
    );
    expect(useAuthStore.getState().user?.memberships).toHaveLength(0);
  });

  it('вход по паролю без членств → /welcome', async () => {
    jest
      .mocked(authMockService.login)
      .mockResolvedValue({ user: NEWBIE, session: SESSION });

    const ok = await useAuthStore.getState().login({
      phone: '+79005556677',
      password: 'password1',
    });
    expect(ok).toBe(true);

    await renderGuestZoneGuard();
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/welcome' },
      undefined,
    );
  });

  it('вход по OTP без членств → /welcome', async () => {
    jest
      .mocked(authMockService.loginWithOtp)
      .mockResolvedValue({ user: NEWBIE, session: SESSION });

    const ok = await useAuthStore
      .getState()
      .loginWithOtp('+79005556677', '123456');
    expect(ok).toBe(true);

    await renderGuestZoneGuard();
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/welcome' },
      undefined,
    );
  });

  it('вход по паролю с членствами → /(tabs) (прежнее поведение сохранено)', async () => {
    jest.mocked(authMockService.login).mockResolvedValue({
      user: {
        ...NEWBIE,
        id: 'u1',
        memberships: [
          {
            userId: 'u1',
            organizationId: 'o1',
            role: 'wholesale_seller',
            title: 'Владелец',
          },
        ],
      },
      session: SESSION,
    });

    const ok = await useAuthStore.getState().login({
      phone: '+79001234567',
      password: 'qwerty123',
    });
    expect(ok).toBe(true);

    await renderGuestZoneGuard();
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/(tabs)' },
      undefined,
    );
  });
});
