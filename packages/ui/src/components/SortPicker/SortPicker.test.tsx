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

describe('SortPicker compact (Промт 15, D)', () => {
  it('компактная высота 32 и короткая подпись', async () => {
    const screen = await render(
      <SortPicker compact value="price-asc" onChange={jest.fn()} />,
    );
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"minHeight":32');
    expect(screen.getByText('Дешевле')).toBeTruthy();
    expect(screen.queryByText('Сначала дешевле')).toBeNull();
  });

  it('без шеврона в compact', async () => {
    const screen = await render(
      <SortPicker compact value="popular" onChange={jest.fn()} />,
    );
    await fireEvent.press(screen.getByLabelText('Сортировка: По популярности'));
    // Меню открыто, но шеврона в кнопке нет.
    expect(screen.getByLabelText('Сортировать По популярности')).toBeTruthy();
  });

  it('открывает меню, выбирает и применяет', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <SortPicker compact value="popular" onChange={onChange} />,
    );
    await fireEvent.press(screen.getByLabelText('Сортировка: По популярности'));
    await fireEvent.press(screen.getByLabelText('Сортировать Сначала дороже'));
    expect(onChange).toHaveBeenCalledWith('price-desc');
    expect(screen.queryByLabelText('Сортировать Сначала дороже')).toBeNull();
  });

  it('обычный режим не изменился: высота 40 с шевроном', async () => {
    const screen = await render(
      <SortPicker value="popular" onChange={jest.fn()} />,
    );
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"height":40');
    expect(screen.getByText('По популярности')).toBeTruthy();
  });
});
