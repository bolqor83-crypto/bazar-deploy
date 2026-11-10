/**
 * Тесты AppHeader: рендер, подпись контекста, кнопки.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { BazarUIProvider } from '@bazar/ui';
import { AppHeader } from './AppHeader';
import { customerContext, mockMemberships } from '../../mocks/context';
import { useContextStore } from '../../stores/contextStore';

async function setup() {
  return render(
    <BazarUIProvider>
      <AppHeader title="Закупка" />
    </BazarUIProvider>
  );
}

describe('AppHeader', () => {
  beforeEach(() => {
    useContextStore.setState({
      active: { ...customerContext },
      memberships: mockMemberships,
      hydrated: true,
    });
  });

  it('показывает заголовок экрана', async () => {
    const screen = await setup();
    expect(screen.getByText('Закупка')).toBeTruthy();
  });

  it('показывает подпись контекста для покупателя', async () => {
    const screen = await setup();
    expect(screen.getByText('Покупатель')).toBeTruthy();
  });

  it('показывает организацию и точку для store_owner', async () => {
    useContextStore.setState({
      active: { userId: 'u1', role: 'store_owner', organizationId: 'o2', locationId: 'l1' },
      memberships: mockMemberships,
    });
    const screen = await setup();
    expect(screen.getByText('У дома · Садовая')).toBeTruthy();
  });

  it('кнопки темы и профиля доступны', async () => {
    const screen = await setup();
    expect(screen.getByLabelText('Тема: системная')).toBeTruthy();
    expect(screen.getByLabelText('Профиль: Иван Петров')).toBeTruthy();
  });

  it('переключатель контекста открывает шит', async () => {
    const screen = await setup();
    await fireEvent.press(screen.getByLabelText('Контекст: Покупатель. Переключить'));
    expect(screen.getByText('Переключить контекст')).toBeTruthy();
    expect(screen.getByText('Роль')).toBeTruthy();
  });
});
