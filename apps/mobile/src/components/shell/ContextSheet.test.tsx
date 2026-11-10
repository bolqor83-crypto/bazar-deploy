/**
 * Тесты ContextSheet: секции ролей/организаций/точек, «Применить».
 */
import { fireEvent, render } from '@testing-library/react-native';
import { BazarUIProvider } from '@bazar/ui';
import { ContextSheet } from './ContextSheet';
import { customerContext, mockMemberships } from '../../mocks/context';
import { useContextStore } from '../../stores/contextStore';

async function setup(props: Partial<Parameters<typeof ContextSheet>[0]> = {}) {
  return render(
    <BazarUIProvider>
      <ContextSheet visible onClose={() => {}} {...props} />
    </BazarUIProvider>
  );
}

describe('ContextSheet', () => {
  beforeEach(() => {
    useContextStore.setState({
      active: { ...customerContext },
      memberships: mockMemberships,
      hydrated: true,
    });
  });

  it('показывает все четыре роли, чипы ролей доступны', async () => {
    const screen = await setup();
    expect(screen.getByText('Покупатель')).toBeTruthy();
    expect(screen.getByText('Владелец точки')).toBeTruthy();
    expect(screen.getByText('Оптовик')).toBeTruthy();
    expect(screen.getByText('Перевозчик')).toBeTruthy();
  });

  it('для покупателя секции организации и точки скрыты', async () => {
    const screen = await setup();
    expect(screen.queryByText('Организация')).toBeNull();
    expect(screen.queryByText('Торговая точка')).toBeNull();
  });

  it('выбор store_owner открывает организации и точки', async () => {
    const screen = await setup();
    await fireEvent.press(screen.getByLabelText('Владелец точки'));
    expect(screen.getByText('Организация')).toBeTruthy();
    expect(screen.getByText('Сеть «У дома»')).toBeTruthy();
    expect(screen.getByText('Магазин «Ромашка»')).toBeTruthy();
    // Точки первой организации (o2)
    expect(screen.getByText('Вся сеть')).toBeTruthy();
    expect(screen.getByText('Точка на Садовой')).toBeTruthy();
    expect(screen.getByText('Точка на Доватора')).toBeTruthy();
  });

  it('смена организации обновляет список точек', async () => {
    const screen = await setup();
    await fireEvent.press(screen.getByLabelText('Владелец точки'));
    await fireEvent.press(screen.getByLabelText('Магазин «Ромашка»'));
    expect(screen.getByText('Ромашка — главный зал')).toBeTruthy();
    expect(screen.queryByText('Точка на Садовой')).toBeNull();
  });

  it('«Применить» записывает контекст в стор', async () => {
    const screen = await setup();
    await fireEvent.press(screen.getByLabelText('Оптовик'));
    await fireEvent.press(screen.getByRole('button', { name: 'Применить' }));
    const { active } = useContextStore.getState();
    expect(active.role).toBe('wholesale_seller');
    expect(active.organizationId).toBe('o1');
    expect(active.locationId).toBeNull();
  });

  it('«Применить» с точкой сохраняет точку', async () => {
    const screen = await setup();
    await fireEvent.press(screen.getByLabelText('Владелец точки'));
    await fireEvent.press(screen.getByLabelText('Точка в Аксае'));
    await fireEvent.press(screen.getByRole('button', { name: 'Применить' }));
    const { active } = useContextStore.getState();
    expect(active.role).toBe('store_owner');
    expect(active.organizationId).toBe('o2');
    expect(active.locationId).toBe('l3');
  });

  it('«Применить» вызывает onClose', async () => {
    const onClose = jest.fn();
    const screen = await setup({ onClose });
    await fireEvent.press(screen.getByRole('button', { name: 'Применить' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('для carrier есть пункт «Без организации»', async () => {
    const screen = await setup();
    await fireEvent.press(screen.getByLabelText('Перевозчик'));
    expect(screen.getByText('Без организации')).toBeTruthy();
    expect(screen.getByText('Транс-Логистик')).toBeTruthy();
  });

  it('роль без членств выключена (чип disabled)', async () => {
    // Убираем членство carrier — чип должен стать недоступным.
    useContextStore.setState({
      active: { ...customerContext },
      memberships: mockMemberships.filter((m) => m.role !== 'carrier'),
    });
    const screen = await setup();
    const chip = screen.getByLabelText('Перевозчик');
    expect(chip.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true })
    );
  });
});
