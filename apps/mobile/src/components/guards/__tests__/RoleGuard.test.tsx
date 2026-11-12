/**
 * Тесты RoleGuard: доступ по активной роли и редирект на первый
 * экран своей роли.
 */
import { render } from '@testing-library/react-native';
import { Redirect } from 'expo-router';
import { Text } from '@bazar/ui';
import type { ActiveContext } from '@bazar/types';
import { customerContext, mockMemberships } from '../../../mocks/context';
import { useContextStore } from '../../../stores/contextStore';
import { RoleGuard } from '../RoleGuard';

function setActive(active: ActiveContext) {
  useContextStore.setState({
    active,
    memberships: mockMemberships,
    hydrated: true,
  });
}

describe('RoleGuard', () => {
  beforeEach(() => {
    jest.mocked(Redirect).mockClear();
    setActive({ ...customerContext });
  });

  it('роль в списке → children', async () => {
    setActive({
      userId: 'u1',
      role: 'store_owner',
      organizationId: 'o2',
      locationId: null,
    });
    const screen = await render(
      <RoleGuard allowedRoles={['store_owner', 'wholesale_seller']}>
        <Text>Экран владельца точки</Text>
      </RoleGuard>,
    );
    expect(screen.getByText('Экран владельца точки')).toBeTruthy();
    expect(jest.mocked(Redirect)).not.toHaveBeenCalled();
  });

  it('роль не в списке → редирект на первый экран своей роли', async () => {
    // Покупатель пытается открыть экран владельца точки
    setActive({ ...customerContext });
    const screen = await render(
      <RoleGuard allowedRoles={['store_owner']}>
        <Text>Экран владельца точки</Text>
      </RoleGuard>,
    );
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/customer/catalog' },
      undefined,
    );
    expect(screen.queryByText('Экран владельца точки')).toBeNull();
  });

  it('carrier вне списка store_owner → /carrier/feed', async () => {
    setActive({
      userId: 'u1',
      role: 'carrier',
      organizationId: 'o4',
      locationId: null,
    });
    await render(
      <RoleGuard allowedRoles={['store_owner', 'wholesale_seller']}>
        <Text>Недоступно</Text>
      </RoleGuard>,
    );
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/carrier/feed' },
      undefined,
    );
  });

  it('wholesale_seller вне списка customer → /wholesale/overview', async () => {
    setActive({
      userId: 'u1',
      role: 'wholesale_seller',
      organizationId: 'o1',
      locationId: null,
    });
    await render(
      <RoleGuard allowedRoles={['customer']}>
        <Text>Недоступно</Text>
      </RoleGuard>,
    );
    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      { href: '/wholesale/overview' },
      undefined,
    );
  });
});
