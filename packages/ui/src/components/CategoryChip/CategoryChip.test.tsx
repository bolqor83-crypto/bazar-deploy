/**
 * Тесты CategoryChip: подпись, активность, нажатие, иконка.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { Carrot } from 'lucide-react-native';
import { CategoryChip } from './CategoryChip';

describe('CategoryChip', () => {
  it('показывает подпись категории', async () => {
    const screen = await render(<CategoryChip label="Овощи" />);
    expect(screen.getByText('Овощи')).toBeTruthy();
  });

  it('нажатие вызывает onPress', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <CategoryChip label="Овощи" onPress={onPress} />,
    );
    await fireEvent.press(screen.getByLabelText('Категория: Овощи'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('активный чип помечается selected', async () => {
    const screen = await render(
      <CategoryChip label="Все" active onPress={jest.fn()} />,
    );
    expect(
      screen.getByLabelText('Категория: Все').props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('неактивный чип не selected', async () => {
    const screen = await render(
      <CategoryChip label="Фрукты" onPress={jest.fn()} />,
    );
    expect(
      screen.getByLabelText('Категория: Фрукты').props.accessibilityState,
    ).toMatchObject({ selected: false });
  });

  it('без onPress рендерится статично (без кнопки)', async () => {
    const screen = await render(<CategoryChip label="Крупы" icon={Carrot} />);
    expect(screen.queryByLabelText('Категория: Крупы')).toBeNull();
    expect(screen.getByText('Крупы')).toBeTruthy();
  });
});
