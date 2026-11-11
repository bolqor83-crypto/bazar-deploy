/**
 * Тесты QuantitySelector: границы min/max, размеры кнопок 48×48,
 * подписи доступности.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { QuantitySelector } from './QuantitySelector';

describe('QuantitySelector', () => {
  it('показывает текущее значение', async () => {
    const screen = await render(
      <QuantitySelector value={5} onChange={jest.fn()} />,
    );
    expect(screen.getByLabelText('Количество: 5')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('«+» увеличивает, «−» уменьшает значение', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <QuantitySelector value={5} onChange={onChange} />,
    );
    await fireEvent.press(screen.getByLabelText('Увеличить количество'));
    expect(onChange).toHaveBeenLastCalledWith(6);
    await fireEvent.press(screen.getByLabelText('Уменьшить количество'));
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it('на минимуме «−» выключена, на максимуме «+» выключена', async () => {
    const screen = await render(
      <QuantitySelector value={0} min={0} max={2} onChange={jest.fn()} />,
    );
    expect(
      screen.getByLabelText('Уменьшить количество').props.accessibilityState,
    ).toEqual({ disabled: true });
    expect(
      screen.getByLabelText('Увеличить количество').props.accessibilityState,
    ).toEqual({ disabled: false });

    const screen2 = await render(
      <QuantitySelector value={2} min={0} max={2} onChange={jest.fn()} />,
    );
    expect(
      screen2.getByLabelText('Увеличить количество').props.accessibilityState,
    ).toEqual({ disabled: true });
  });

  it('выключенные кнопки не меняют значение', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <QuantitySelector value={0} onChange={onChange} min={0} />,
    );
    await fireEvent.press(screen.getByLabelText('Уменьшить количество'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disabled выключает обе кнопки', async () => {
    const screen = await render(
      <QuantitySelector value={5} onChange={jest.fn()} disabled />,
    );
    expect(
      screen.getByLabelText('Уменьшить количество').props.accessibilityState,
    ).toEqual({ disabled: true });
    expect(
      screen.getByLabelText('Увеличить количество').props.accessibilityState,
    ).toEqual({ disabled: true });
  });
});
