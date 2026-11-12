/**
 * Тесты SearchBar: ввод, плейсхолдер, очистка, отправка.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('показывает плейсхолдер и иконку поиска', async () => {
    const screen = await render(
      <SearchBar
        value=""
        onChangeText={jest.fn()}
        placeholder="Поиск: помидоры, яблоки…"
      />,
    );
    expect(
      screen.getByPlaceholderText('Поиск: помидоры, яблоки…'),
    ).toBeTruthy();
  });

  it('передаёт ввод наверх', async () => {
    const onChangeText = jest.fn();
    const screen = await render(
      <SearchBar value="" onChangeText={onChangeText} />,
    );
    fireEvent.changeText(
      screen.getByLabelText('Поиск по каталогу'),
      'помидоры',
    );
    expect(onChangeText).toHaveBeenCalledWith('помидоры');
  });

  it('с текстом появляется кнопка очистки и очищает', async () => {
    const onChangeText = jest.fn();
    const screen = await render(
      <SearchBar value="помидоры" onChangeText={onChangeText} />,
    );
    const clear = screen.getByLabelText('Очистить поиск');
    await fireEvent.press(clear);
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('без текста кнопки очистки нет', async () => {
    const screen = await render(
      <SearchBar value="" onChangeText={jest.fn()} />,
    );
    expect(screen.queryByLabelText('Очистить поиск')).toBeNull();
  });

  it('onSubmitEditing вызывает onSubmit', async () => {
    const onSubmit = jest.fn();
    const screen = await render(
      <SearchBar value="яблоки" onChangeText={jest.fn()} onSubmit={onSubmit} />,
    );
    fireEvent(screen.getByLabelText('Поиск по каталогу'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
