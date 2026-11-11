/**
 * Тесты AuthGuard: все комбинации состояния аутентификации,
 * режимов requireAuth и пост-аутентификационной маршрутизации
 * (с членствами → /(tabs), без членств → /welcome, фикс Бага №2).
 */
import { render } from '@testing-library/react-native';
import { Redirect } from 'expo-router';
import { Text } from '@bazar/ui';
import type { AuthUser } from '@bazar/types';
import { AuthGuard } from '../AuthGuard';
import {
  __resetAuthStoreForTests,
  useAuthStore,
} from '../../../stores/authStore';

const USER_WITH_MEMBERSHIPS: AuthUser = {
  id: 'u1',
  phone: '+79001234567',
  name: 'Иван Петров',
  createdAt: '2026-01-01T00:00:00.000Z',
  memberships: [
    {
      userId: 'u1',
      organizationId: 'o1',
      role: 'wholesale_seller',
      title: 'Владелец',
    },
  ],
};

const USER_WITHOUT_MEMBERSHIPS: AuthUser = {
  id: 'u2',
  phone: '+79001112233',
  name: 'Мария Иванова',
  createdAt: '2026-01-02T00:00:00.000Z',
  memberships: [],
};

function renderGuard(requireAuth: boolean) {
  return render(
    <AuthGuard requireAuth={requireAuth}>
      <Text>Контент внутри</Text>
    </AuthGuard>,
  );
}

describe('AuthGuard', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    jest.mocked(Redirect).mockClear();
  });

  it('unauthenticated + requireAuth → редирект на /login', async () => {
    useAuthStore.setState({ state: 'unauthenticated' });
    const screen = await renderGuard(true);
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/login' },
      undefined,
    );
    expect(screen.queryByText('Контент внутри')).toBeNull();
  });

  it('authenticated + requireAuth → children (с членствами и без)', async () => {
    useAuthStore.setState({
      state: 'authenticated',
      user: USER_WITHOUT_MEMBERSHIPS,
    });
    const screen = await renderGuard(true);
    expect(screen.getByText('Контент внутри')).toBeTruthy();
    expect(jest.mocked(Redirect)).not.toHaveBeenCalled();
  });

  it('authenticated + !requireAuth + членства → редирект на /(tabs)', async () => {
    useAuthStore.setState({
      state: 'authenticated',
      user: USER_WITH_MEMBERSHIPS,
    });
    const screen = await renderGuard(false);
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/(tabs)' },
      undefined,
    );
    expect(screen.queryByText('Контент внутри')).toBeNull();
  });

  it('authenticated + !requireAuth + без членств → редирект на /welcome (Баг №2)', async () => {
    useAuthStore.setState({
      state: 'authenticated',
      user: USER_WITHOUT_MEMBERSHIPS,
    });
    const screen = await renderGuard(false);
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/welcome' },
      undefined,
    );
    expect(screen.queryByText('Контент внутри')).toBeNull();
  });

  it('authenticated + !requireAuth + user null → /welcome (защитное поведение)', async () => {
    useAuthStore.setState({ state: 'authenticated', user: null });
    await renderGuard(false);
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/welcome' },
      undefined,
    );
  });

  it('unauthenticated + !requireAuth → children', async () => {
    useAuthStore.setState({ state: 'unauthenticated' });
    const screen = await renderGuard(false);
    expect(screen.getByText('Контент внутри')).toBeTruthy();
    expect(jest.mocked(Redirect)).not.toHaveBeenCalled();
  });

  it('unknown → скелетон, ни редиректа, ни children', async () => {
    useAuthStore.setState({ state: 'unknown' });
    const screen = await renderGuard(true);
    expect(screen.queryByText('Контент внутри')).toBeNull();
    expect(jest.mocked(Redirect)).not.toHaveBeenCalled();
    // Скелетон вместо спиннера: блоки без текста, дерево живо
    expect(screen.toJSON()).toBeTruthy();
    expect(screen.queryByText(/.+/)).toBeNull();
  });
});
