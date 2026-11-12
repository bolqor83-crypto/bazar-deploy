/**
 * Тесты FilterChip: активность, режим тега с удалением, нажатие.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import { FilterChip } from './FilterChip';

describe('FilterChip', () => {
  it('показывает подпись фильтра', async () => {
    const screen = await render(<FilterChip label="Фильтры" />);
    expect(screen.getByText('Фильтры')).toBeTruthy();
  });

  it('нажатие вызывает onPress', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <FilterChip label="Фильтры" icon={SlidersHorizontal} onPress={onPress} />,
    );
    await fireEvent.press(screen.getByLabelText('Фильтр: Фильтры'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('режим тега: onRemove убирает фильтр по крестику', async () => {
    const onRemove = jest.fn();
    const screen = await render(
      <FilterChip label="помидоры" onRemove={onRemove} />,
    );
    await fireEvent.press(screen.getByLabelText('Убрать фильтр: помидоры'));
    expect(onRemove).toHaveBeenCalledTimes(1);
    // onPress не задан — тег только удаляется
    expect(screen.queryByLabelText('Фильтр: помидоры')).toBeNull();
  });

  it('активный фильтр помечается selected', async () => {
    const screen = await render(
      <FilterChip label="Фильтры" active onPress={jest.fn()} />,
    );
    expect(
      screen.getByLabelText('Фильтр: Фильтры').props.accessibilityState,
    ).toMatchObject({ selected: true });
  });
});
