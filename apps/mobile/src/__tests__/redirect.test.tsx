/**
 * Тесты редиректа «/» по активной роли (Промт 3, §6.4).
 */
import { render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ActiveContext } from '@bazar/types';
import TabsIndex from '../app/(tabs)/index';
import { customerContext, mockMemberships } from '../mocks/context';
import { useContextStore } from '../stores/contextStore';

function setContext(active: ActiveContext) {
  useContextStore.setState({
    active,
    memberships: mockMemberships,
    hydrated: true,
  });
}

async function renderIndex() {
  return render(<TabsIndex />);
}

describe('(tabs)/index: редирект по активной роли', () => {
  beforeEach(() => {
    jest.mocked(router.replace).mockClear();
    setContext({ ...customerContext });
  });

  it('customer → /customer/home', async () => {
    await renderIndex();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/customer/home');
    });
  });

  it('store_owner → /store/purchase', async () => {
    setContext({ userId: 'u1', role: 'store_owner', organizationId: 'o2', locationId: null });
    await renderIndex();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/store/purchase');
    });
  });

  it('wholesale_seller → /wholesale/overview', async () => {
    setContext({ userId: 'u1', role: 'wholesale_seller', organizationId: 'o1', locationId: null });
    await renderIndex();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/wholesale/overview');
    });
  });

  it('carrier → /carrier/feed', async () => {
    setContext({ userId: 'u1', role: 'carrier', organizationId: 'o4', locationId: null });
    await renderIndex();
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/carrier/feed');
    });
  });

  it('до гидратации показывает скелетон и не редиректит', async () => {
    useContextStore.setState({
      active: { ...customerContext },
      memberships: mockMemberships,
      hydrated: false,
    });
    const screen = await renderIndex();
    expect(router.replace).not.toHaveBeenCalled();
    // Скелетон: блоки без текста
    expect(screen.queryByText(/.+/)).toBeNull();
    expect(screen.toJSON()).toBeTruthy();
  });
});
