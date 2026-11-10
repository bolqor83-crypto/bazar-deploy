/**
 * Тесты компонента IconButton.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { Sun } from 'lucide-react-native';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('рендерится с обязательной меткой доступности', async () => {
    const screen = await render(
      <IconButton icon={Sun} accessibilityLabel="Переключить тему" />
    );
    expect(screen.getByRole('button', { name: 'Переключить тему' })).toBeTruthy();
  });

  it('вызывает onPress', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <IconButton icon={Sun} accessibilityLabel="Тема" onPress={onPress} />
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Тема' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(['sm', 'md', 'lg'] as const)('размер %s: зона не меньше заявленной', async (size) => {
    const sizes = { sm: 44, md: 48, lg: 56 };
    const screen = await render(<IconButton icon={Sun} accessibilityLabel="Тема" size={size} />);
    const flat = [screen.getByRole('button').props.style].flat();
    expect(flat.find((s: { width?: number }) => s?.width === sizes[size])).toBeTruthy();
  });

  it('hitSlop расширяет зону нажатия', async () => {
    const screen = await render(<IconButton icon={Sun} accessibilityLabel="Тема" />);
    expect(screen.getByRole('button').props.hitSlop).toBe(8);
  });

  it('disabled: состояние и блокировка нажатия', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <IconButton icon={Sun} accessibilityLabel="Тема" disabled onPress={onPress} />
    );
    const button = screen.getByRole('button', { name: 'Тема' });
    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('destructive-вариант использует цвет danger', async () => {
    const screen = await render(
      <IconButton icon={Sun} accessibilityLabel="Удалить" variant="destructive" />
    );
    const iconNode = JSON.stringify(screen.toJSON());
    expect(iconNode).toContain('#9F4C3B');
  });
});
