/**
 * Тесты Checkbox (Промт 12, Часть C): состояния, onChange, a11y,
 * disabled, hint.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('unchecked — пустой квадрат с рамкой, без чекмарка', async () => {
    const screen = await render(
      <Checkbox checked={false} onChange={jest.fn()} label="Уведомления" />,
    );
    expect(screen.getByRole('checkbox')).toBeTruthy();
    expect(screen.queryByText('✓')).toBeNull();
  });

  it('тап вызывает onChange с инверсией состояния', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <Checkbox checked={false} onChange={onChange} label="Уведомления" />,
    );
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);

    const onChangeOff = jest.fn();
    const screenOn = await render(
      <Checkbox checked onChange={onChangeOff} label="Уведомления" />,
    );
    await fireEvent.press(screenOn.getByRole('checkbox'));
    expect(onChangeOff).toHaveBeenCalledWith(false);
  });

  it('a11y: role=checkbox, label и accessibilityState', async () => {
    const screen = await render(
      <Checkbox
        checked={false}
        onChange={jest.fn()}
        label="Согласие на обработку"
      />,
    );
    const box = screen.getByRole('checkbox', { name: 'Согласие на обработку' });
    expect(box.props.accessibilityState.checked).toBe(false);
  });

  it('checked-состояние отражается в accessibilityState', async () => {
    const screen = await render(
      <Checkbox checked onChange={jest.fn()} label="Согласие на обработку" />,
    );
    expect(
      screen.getByRole('checkbox', { name: 'Согласие на обработку' }).props
        .accessibilityState.checked,
    ).toBe(true);
  });

  it('disabled не вызывает onChange', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <Checkbox
        checked={false}
        onChange={onChange}
        label="Заблокирован"
        disabled
      />,
    );
    const box = screen.getByRole('checkbox', { name: 'Заблокирован' });
    expect(box.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(box);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('hint — вторая строка пункта', async () => {
    const screen = await render(
      <Checkbox
        checked
        onChange={jest.fn()}
        label="Уведомления"
        hint="О новых заказах утром"
      />,
    );
    expect(screen.getByText('О новых заказах утром')).toBeTruthy();
  });
});
