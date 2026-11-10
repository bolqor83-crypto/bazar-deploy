/**
 * Тесты RoleShell: шапка + контент + таб-бар, шит «Ещё».
 */
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from '@bazar/ui';
import { RoleShell } from './RoleShell';
import { ROLE_NAV } from './navigation';

const TABS = ROLE_NAV.store_owner.tabs;
const MORE = ROLE_NAV.store_owner.more;

async function setup() {
  return render(
    <RoleShell
      title="Закупка"
      tabItems={TABS}
      activeTabKey="purchase"
      onTabChange={() => {}}
      moreItems={MORE}
    >
      <Text>Контент экрана</Text>
    </RoleShell>
  );
}

describe('RoleShell', () => {
  it('рендерит шапку с заголовком и контент', async () => {
    const screen = await setup();
    // «Закупка» — и в шапке, и в таб-баре
    expect(screen.getAllByText('Закупка').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Контент экрана')).toBeTruthy();
  });

  it('рендерит таб-бар роли store_owner', async () => {
    const screen = await setup();
    expect(screen.getByRole('tab', { name: 'Закупка' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Лента' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Витрина' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Ещё' })).toBeTruthy();
  });

  it('нажатие вкладки вызывает onTabChange', async () => {
    const onTabChange = jest.fn();
    const screen = await render(
      <RoleShell
        title="Закупка"
        tabItems={TABS}
        activeTabKey="purchase"
        onTabChange={onTabChange}
        moreItems={MORE}
      >
        <Text>Контент</Text>
      </RoleShell>
    );
    await fireEvent.press(screen.getByRole('tab', { name: 'Заказы' }));
    expect(onTabChange).toHaveBeenCalledWith('orders');
  });

  it('«Ещё» открывает шит с остальными разделами', async () => {
    const onTabChange = jest.fn();
    const screen = await render(
      <RoleShell
        title="Закупка"
        tabItems={TABS}
        activeTabKey="purchase"
        onTabChange={onTabChange}
        moreItems={MORE}
      >
        <Text>Контент</Text>
      </RoleShell>
    );
    await fireEvent.press(screen.getByRole('tab', { name: 'Ещё' }));
    expect(screen.getByText('Долги')).toBeTruthy();
    expect(screen.getByText('Заметки')).toBeTruthy();
    expect(screen.getByText('Финансы')).toBeTruthy();
    expect(screen.getByText('Профиль')).toBeTruthy();
    expect(screen.getByText('Настройки')).toBeTruthy();

    // Выбор раздела из шита прокидывается в onTabChange
    await fireEvent.press(screen.getByLabelText('Долги'));
    expect(onTabChange).toHaveBeenCalledWith('debts');
  });

  it('роль без «Ещё» (customer) не открывает шит', async () => {
    const screen = await render(
      <RoleShell
        title="Главная"
        tabItems={ROLE_NAV.customer.tabs}
        activeTabKey="home"
        onTabChange={() => {}}
      >
        <Text>Контент</Text>
      </RoleShell>
    );
    // У customer нет пункта «Ещё»
    expect(screen.queryByRole('tab', { name: 'Ещё' })).toBeNull();
    expect(screen.getByRole('tab', { name: 'Избранное' })).toBeTruthy();
  });
});
