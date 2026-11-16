/**
 * Тесты RoleShell: шапка + контент + таб-бар. Пункт «Инструменты» —
 * переход на полноэкранный экран (Промт 12, Часть D), не шит.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from '@bazar/ui';
import { RoleShell } from './RoleShell';
import { ROLE_NAV } from './navigation';

const TABS = ROLE_NAV.store_owner.tabs;

async function setup() {
  return render(
    <RoleShell
      title="Закупка"
      tabItems={TABS}
      activeTabKey="purchase"
      onTabChange={() => {}}
    >
      <Text>Контент экрана</Text>
    </RoleShell>,
  );
}

describe('RoleShell', () => {
  it('рендерит шапку с заголовком и контент', async () => {
    const screen = await setup();
    // «Закупка» — и в шапке, и в таб-баре
    expect(screen.getAllByText('Закупка').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Контент экрана')).toBeTruthy();
  });

  it('рендерит таб-бар роли store_owner с пунктом «Ещё»', async () => {
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
      >
        <Text>Контент</Text>
      </RoleShell>,
    );
    await fireEvent.press(screen.getByRole('tab', { name: 'Заказы' }));
    expect(onTabChange).toHaveBeenCalledWith('orders');
  });

  it('«Ещё» прокидывается в onTabChange (переход на /more)', async () => {
    const onTabChange = jest.fn();
    const screen = await render(
      <RoleShell
        title="Закупка"
        tabItems={TABS}
        activeTabKey="purchase"
        onTabChange={onTabChange}
      >
        <Text>Контент</Text>
      </RoleShell>,
    );
    await fireEvent.press(screen.getByRole('tab', { name: 'Ещё' }));
    expect(onTabChange).toHaveBeenCalledWith('more');
  });

  it('роль без «Ещё» (customer) его не показывает', async () => {
    const screen = await render(
      <RoleShell
        title="Главная"
        tabItems={ROLE_NAV.customer.tabs}
        activeTabKey="home"
        onTabChange={() => {}}
      >
        <Text>Контент</Text>
      </RoleShell>,
    );
    expect(screen.queryByRole('tab', { name: 'Ещё' })).toBeNull();
    expect(screen.getByRole('tab', { name: 'Избранное' })).toBeTruthy();
  });
});
