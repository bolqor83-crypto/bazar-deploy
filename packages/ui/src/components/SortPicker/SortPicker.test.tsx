/**
 * Тесты SortPicker: текущая сортировка, меню, выбор, значения API.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { SortPicker, SORT_OPTIONS } from './SortPicker';

describe('SortPicker', () => {
  it('показывает текущую сортировку на кнопке', async () => {
    const screen = await render(
      <SortPicker value="popular" onChange={jest.fn()} />,
    );
    expect(screen.getByLabelText('Сортировка: По популярности')).toBeTruthy();
  });

  it('меню открывается и содержит все четыре варианта', async () => {
    const screen = await render(
      <SortPicker value="popular" onChange={jest.fn()} />,
    );
    await fireEvent.press(screen.getByLabelText('Сортировка: По популярности'));
    for (const option of SORT_OPTIONS) {
      expect(screen.getByLabelText(`Сортировать ${option.label}`)).toBeTruthy();
    }
  });

  it('выбор варианта закрывает меню и вызывает onChange', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <SortPicker value="popular" onChange={onChange} />,
    );
    await fireEvent.press(screen.getByLabelText('Сортировка: По популярности'));
    await fireEvent.press(screen.getByLabelText('Сортировать Сначала дешевле'));
    expect(onChange).toHaveBeenCalledWith('price-asc');
    expect(screen.queryByLabelText('Сортировать Сначала дешевле')).toBeNull();
  });

  it('значения вариантов совпадают с API каталога', () => {
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual([
      'popular',
      'price-asc',
      'price-desc',
      'name',
    ]);
  });
});
