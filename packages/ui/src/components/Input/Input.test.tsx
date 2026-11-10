/**
 * Тесты компонента Input.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { Input } from './Input';

describe('Input', () => {
  it('рендерит подпись и поле', async () => {
    const screen = await render(
      <Input label="Номер телефона" value="" onChangeText={() => {}} />,
    );
    expect(screen.getByText('Номер телефона')).toBeTruthy();
    expect(screen.getByLabelText('Номер телефона')).toBeTruthy();
  });

  it('передаёт onChangeText', async () => {
    const onChangeText = jest.fn();
    const screen = await render(
      <Input label="Телефон" value="" onChangeText={onChangeText} />,
    );
    await fireEvent.changeText(
      screen.getByLabelText('Телефон'),
      '+7 900 000-00-00',
    );
    expect(onChangeText).toHaveBeenCalledWith('+7 900 000-00-00');
  });

  it('ошибка: граница danger, текст ошибки под полем, accessibilityHint', async () => {
    const screen = await render(
      <Input
        label="ИНН"
        value=""
        onChangeText={() => {}}
        error="Проверьте ИНН"
      />,
    );
    expect(screen.getByText('Проверьте ИНН')).toBeTruthy();
    const field = screen.getByLabelText('ИНН').parent;
    expect(field?.props.style.borderColor).toBe('#9F4C3B');
    expect(field?.props.style.borderWidth).toBe(2);
    expect(screen.getByLabelText('ИНН').props.accessibilityHint).toBe(
      'Проверьте ИНН',
    );
  });

  it('подсказка скрыта при ошибке', async () => {
    const screen = await render(
      <Input
        label="ИНН"
        value=""
        onChangeText={() => {}}
        hint="10 или 12 цифр"
        error="Проверьте ИНН"
      />,
    );
    expect(screen.queryByText('10 или 12 цифр')).toBeNull();
    expect(screen.getByText('Проверьте ИНН')).toBeTruthy();
  });

  it('подсказка видна без ошибки', async () => {
    const screen = await render(
      <Input
        label="ИНН"
        value=""
        onChangeText={() => {}}
        hint="10 или 12 цифр"
      />,
    );
    expect(screen.getByText('10 или 12 цифр')).toBeTruthy();
  });

  it('фокус: граница primary 2px', async () => {
    const screen = await render(
      <Input label="Поиск" value="" onChangeText={() => {}} />,
    );
    await fireEvent(screen.getByLabelText('Поиск'), 'focus');
    // Перечитываем дерево: стили обновились после рендера
    const field = screen.getByLabelText('Поиск').parent;
    expect(field?.props.style.borderColor).toBe('#2E6B4E');
    expect(field?.props.style.borderWidth).toBe(2);
  });

  it('без подписи рендерится и не падает', async () => {
    const screen = await render(
      <Input value="" onChangeText={() => {}} placeholder="Поиск" />,
    );
    expect(screen.getByPlaceholderText('Поиск')).toBeTruthy();
  });

  it('rightIcon: рендерится справа, нажатие вызывает колбэк', async () => {
    const onRightIconPress = jest.fn();
    const screen = await render(
      <Input
        label="Пароль"
        value=""
        onChangeText={() => {}}
        rightIcon={<></>}
        rightIconAccessibilityLabel="Показать пароль"
        onRightIconPress={onRightIconPress}
      />,
    );
    const iconButton = screen.getByLabelText('Показать пароль');
    expect(iconButton).toBeTruthy();
    // Зона нажатия ≥ 48×48
    expect(iconButton.props.style.minHeight).toBe(48);
    await fireEvent.press(iconButton);
    expect(onRightIconPress).toHaveBeenCalledTimes(1);
  });
});
