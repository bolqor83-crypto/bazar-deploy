/**
 * Тесты Radio (Промт 12, Часть C): выбор, onPress, a11y, disabled.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { Radio } from './Radio';

describe('Radio', () => {
  it('рендерит вариант с подписью', async () => {
    const screen = await render(
      <Radio selected={false} onPress={jest.fn()} label="Курьером" />,
    );
    expect(screen.getByRole('radio', { name: 'Курьером' })).toBeTruthy();
  });

  it('тап вызывает onPress', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <Radio selected={false} onPress={onPress} label="Самовывоз" />,
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Самовывоз' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('selected отражается в accessibilityState', async () => {
    const screen = await render(
      <Radio selected onPress={jest.fn()} label="Курьером" />,
    );
    expect(
      screen.getByRole('radio', { name: 'Курьером' }).props.accessibilityState
        .selected,
    ).toBe(true);
  });

  it('disabled не вызывает onPress', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <Radio selected={false} onPress={onPress} label="Недоступно" disabled />,
    );
    const radio = screen.getByRole('radio', { name: 'Недоступно' });
    expect(radio.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(radio);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('hint — пояснение варианта', async () => {
    const screen = await render(
      <Radio
        selected
        onPress={jest.fn()}
        label="Курьером"
        hint="Доставка до 12:00"
      />,
    );
    expect(screen.getByText('Доставка до 12:00')).toBeTruthy();
  });
});
