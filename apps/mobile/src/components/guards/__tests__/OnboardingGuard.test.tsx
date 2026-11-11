/**
 * Тесты OnboardingGuard: комбинации состояния аутентификации
 * и членств.
 */
import { render } from '@testing-library/react-native';
import { Redirect } from 'expo-router';
import { Text } from '@bazar/ui';
import type { AuthUser } from '@bazar/types';
import { OnboardingGuard } from '../OnboardingGuard';
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
  id: 'u9',
  phone: '+79005556677',
  name: 'Мария Иванова',
  createdAt: '2026-01-02T00:00:00.000Z',
  memberships: [],
};

describe('OnboardingGuard', () => {
  beforeEach(() => {
    __resetAuthStoreForTests();
    jest.mocked(Redirect).mockClear();
  });

  it('unknown → скелетон, ни редиректа, ни children', async () => {
    useAuthStore.setState({ state: 'unknown' });
    const screen = await render(
      <OnboardingGuard>
        <Text>Контент онбординга</Text>
      </OnboardingGuard>,
    );
    expect(screen.queryByText('Контент онбординга')).toBeNull();
    expect(jest.mocked(Redirect)).not.toHaveBeenCalled();
    expect(screen.toJSON()).toBeTruthy();
  });

  it('unauthenticated → редирект на /login', async () => {
    useAuthStore.setState({ state: 'unauthenticated' });
    const screen = await render(
      <OnboardingGuard>
        <Text>Контент онбординга</Text>
      </OnboardingGuard>,
    );
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/login' },
      undefined,
    );
    expect(screen.queryByText('Контент онбординга')).toBeNull();
  });

  it('есть членства → редирект на /(tabs)', async () => {
    useAuthStore.setState({
      state: 'authenticated',
      user: USER_WITH_MEMBERSHIPS,
    });
    const screen = await render(
      <OnboardingGuard>
        <Text>Контент онбординга</Text>
      </OnboardingGuard>,
    );
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/(tabs)' },
      undefined,
    );
    expect(screen.queryByText('Контент онбординга')).toBeNull();
  });

  it('без членств → children (онбординг показывается)', async () => {
    useAuthStore.setState({
      state: 'authenticated',
      user: USER_WITHOUT_MEMBERSHIPS,
    });
    const screen = await render(
      <OnboardingGuard>
        <Text>Контент онбординга</Text>
      </OnboardingGuard>,
    );
    expect(screen.getByText('Контент онбординга')).toBeTruthy();
    expect(jest.mocked(Redirect)).not.toHaveBeenCalled();
  });
});
