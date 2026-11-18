/**
 * Тесты OrderPartyGroup — группы заказов контрагента
 * (Промт 15, Часть E).
 */
import { fireEvent, render } from '@testing-library/react-native';
import { View } from 'react-native';
import { OrderPartyGroup } from './OrderPartyGroup';

const BASE = {
  party: { id: 'p1', name: 'Опт-Юг' },
  count: 3,
  activeCount: 1,
  totalSum: 1_240_000,
  onToggle: jest.fn(),
};

describe('OrderPartyGroup (Промт 15, E)', () => {
  it('показывает имя, счётчик и сумму табличными цифрами', async () => {
    const screen = await render(<OrderPartyGroup {...BASE} expanded={false} />);
    expect(screen.getByText('Опт-Юг')).toBeTruthy();
    // «3 заказа · 12 400 ₽»
    expect(screen.getByText(/3 заказа · 12[\s\u202F]400 ₽/)).toBeTruthy();
  });

  it('показывает чип активных при activeCount > 0', async () => {
    const screen = await render(
      <OrderPartyGroup {...BASE} activeCount={1} expanded={false} />,
    );
    expect(screen.getByText('1 активный')).toBeTruthy();
  });

  it('без активных чипа нет', async () => {
    const screen = await render(
      <OrderPartyGroup {...BASE} activeCount={0} expanded={false} />,
    );
    expect(screen.queryByText(/активный/)).toBeNull();
  });

  it('детская карточка видна только в развёрнутой группе', async () => {
    const collapsed = await render(
      <OrderPartyGroup {...BASE} expanded={false}>
        <View testID="group-child" />
      </OrderPartyGroup>,
    );
    expect(collapsed.queryByTestId('group-child')).toBeNull();

    const expanded = await render(
      <OrderPartyGroup {...BASE} expanded={true}>
        <View testID="group-child" />
      </OrderPartyGroup>,
    );
    expect(expanded.getByTestId('group-child')).toBeTruthy();
  });

  it('нажатие заголовка вызывает onToggle, a11y-состояние expanded', async () => {
    const onToggle = jest.fn();
    const screen = await render(
      <OrderPartyGroup
        {...BASE}
        onToggle={onToggle}
        expanded={false}
        testID="og"
      />,
    );
    const label = 'Опт-Юг, 3 заказа, развернуть';
    expect(screen.getByLabelText(label).props.accessibilityState).toMatchObject(
      { expanded: false },
    );
    await fireEvent.press(screen.getByLabelText(label));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('в развёрнутой группе метка — «свернуть»', async () => {
    const screen = await render(<OrderPartyGroup {...BASE} expanded={true} />);
    expect(screen.getByLabelText('Опт-Юг, 3 заказа, свернуть')).toBeTruthy();
  });

  it('заголовок ≥ 48 по высоте (зоны нажатия, перчатки)', async () => {
    const screen = await render(<OrderPartyGroup {...BASE} expanded={false} />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"minHeight":64');
  });

  it('аватар-инициалы из двух слов', async () => {
    const screen = await render(
      <OrderPartyGroup
        {...BASE}
        party={{ id: 'p2', name: 'Агрофирма Юг' }}
        expanded={false}
      />,
    );
    expect(screen.getByText('АЮ')).toBeTruthy();
  });
});
