/**
 * Тесты компонента Button.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  it('рендерит текст и имеет роль button', async () => {
    const screen = await render(<Button>Оформить заказ</Button>);
    expect(screen.getByRole('button', { name: 'Оформить заказ' })).toBeTruthy();
  });

  it('вызывает onPress по нажатию', async () => {
    const onPress = jest.fn();
    const screen = await render(<Button onPress={onPress}>Дальше</Button>);
    await fireEvent.press(screen.getByRole('button', { name: 'Дальше' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled: не вызывает onPress, состояние disabled', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <Button disabled onPress={onPress}>
        Недоступно
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Недоступно' });
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true }),
    );
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('loading: занят, текст скрыт, точки вместо спиннера', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <Button loading onPress={onPress}>
        Сохранить
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true }),
    );
    expect(screen.queryByText('Сохранить')).toBeNull();
    expect(screen.getByLabelText('Загрузка')).toBeTruthy();
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it.each(['primary', 'secondary', 'ghost', 'destructive'] as const)(
    'вариант %s рендерится без обязательных пропсов',
    async (variant) => {
      const screen = await render(<Button variant={variant}>Кнопка</Button>);
      expect(screen.getByRole('button', { name: 'Кнопка' })).toBeTruthy();
    },
  );

  it.each(['sm', 'md', 'lg'] as const)(
    'размер %s имеет корректную высоту',
    async (size) => {
      const heights = { sm: 40, md: 48, lg: 56 };
      const screen = await render(<Button size={size}>Кнопка</Button>);
      const style = screen.getByRole('button').props.style;
      const flat = Array.isArray(style) ? style.flat() : [style];
      expect(
        flat.find((s: { height?: number }) => s?.height === heights[size]),
      ).toBeTruthy();
    },
  );

  it('destructive использует цвет danger (терракота)', async () => {
    const screen = await render(<Button variant="destructive">Удалить</Button>);
    const flat = [screen.getByRole('button').props.style].flat();
    const container = flat.find(
      (s: { backgroundColor?: string }) => s?.backgroundColor,
    );
    expect(container?.backgroundColor).toBe('#9F4C3B');
  });

  it('fullWidth растягивает кнопку на контейнер', async () => {
    const screen = await render(<Button fullWidth>Войти</Button>);
    const flat = [screen.getByRole('button').props.style].flat();
    const container = flat.find((s: { alignSelf?: string }) => s?.alignSelf);
    expect(container?.alignSelf).toBe('stretch');
  });
});
