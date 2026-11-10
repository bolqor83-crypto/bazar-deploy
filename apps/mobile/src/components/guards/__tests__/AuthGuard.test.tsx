/**
 * Тесты AuthGuard: все комбинации состояния аутентификации
 * и режимов requireAuth.
 */
import { render } from '@testing-library/react-native';
import { Redirect } from 'expo-router';
import { Text } from '@bazar/ui';
import { AuthGuard } from '../AuthGuard';
import {
  __resetAuthStoreForTests,
  useAuthStore,
} from '../../../stores/authStore';

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

  it('authenticated + requireAuth → children', async () => {
    useAuthStore.setState({ state: 'authenticated' });
    const screen = await renderGuard(true);
    expect(screen.getByText('Контент внутри')).toBeTruthy();
    expect(jest.mocked(Redirect)).not.toHaveBeenCalled();
  });

  it('authenticated + !requireAuth → редирект на /(tabs)', async () => {
    useAuthStore.setState({ state: 'authenticated' });
    const screen = await renderGuard(false);
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/(tabs)' },
      undefined,
    );
    expect(screen.queryByText('Контент внутри')).toBeNull();
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
