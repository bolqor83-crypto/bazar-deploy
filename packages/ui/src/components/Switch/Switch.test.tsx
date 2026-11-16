/**
 * Тесты Switch (Промт 12, Часть C): состояния, onChange, a11y,
 * disabled, с подписью и без.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { Switch } from './Switch';

describe('Switch', () => {
  it('без подписи рендерит один переключатель', async () => {
    const screen = await render(<Switch value={false} onChange={jest.fn()} />);
    expect(screen.getByRole('switch')).toBeTruthy();
  });

  it('тап вызывает onChange с инверсией', async () => {
    const onChange = jest.fn();
    const screen = await render(<Switch value={false} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);

    const onChangeOff = jest.fn();
    const screenOn = await render(<Switch value onChange={onChangeOff} />);
    await fireEvent.press(screenOn.getByRole('switch'));
    expect(onChangeOff).toHaveBeenCalledWith(false);
  });

  it('a11y: value отражается в accessibilityState (aria-checked)', async () => {
    const screen = await render(
      <Switch value onChange={jest.fn()} label="Тёмная тема" />,
    );
    expect(
      screen.getByRole('switch', { name: 'Тёмная тема' }).props
        .accessibilityState.checked,
    ).toBe(true);
  });

  it('disabled не вызывает onChange', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <Switch
        value={false}
        onChange={onChange}
        label="Заблокирован"
        disabled
      />,
    );
    const toggle = screen.getByRole('switch', { name: 'Заблокирован' });
    expect(toggle.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('подпись и hint рядом с треком', async () => {
    const screen = await render(
      <Switch
        value={false}
        onChange={jest.fn()}
        label="Автоприём заказов"
        hint="Новые заказы принимаются без подтверждения"
      />,
    );
    expect(screen.getByText('Автоприём заказов')).toBeTruthy();
    expect(
      screen.getByText('Новые заказы принимаются без подтверждения'),
    ).toBeTruthy();
  });
});
