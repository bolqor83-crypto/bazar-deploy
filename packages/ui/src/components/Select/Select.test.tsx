/**
 * Тесты Select (Промт 12, Часть C): триггер, шит, выбор, disabled,
 * ошибка, пустой список.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Select } from './Select';

const OPTIONS = [
  { value: 'msk', label: 'Москва', hint: 'Центральный склад' },
  { value: 'spb', label: 'Санкт-Петербург' },
  { value: 'kzn', label: 'Казань' },
];

describe('Select', () => {
  it('показывает placeholder без значения и выбранную опцию со значением', async () => {
    const empty = await render(
      <Select value={null} onChange={jest.fn()} options={OPTIONS} />,
    );
    expect(empty.getByText('Выберите…')).toBeTruthy();

    const filled = await render(
      <Select value="spb" onChange={jest.fn()} options={OPTIONS} />,
    );
    expect(filled.getByText('Санкт-Петербург')).toBeTruthy();
  });

  it('триггер — combobox с label и expanded-состоянием', async () => {
    const screen = await render(
      <Select
        value={null}
        onChange={jest.fn()}
        options={OPTIONS}
        label="Город"
      />,
    );
    const trigger = screen.getByRole('combobox');
    expect(trigger.props.accessibilityLabel).toBe('Город: Выберите…');
    expect(trigger.props.accessibilityState.expanded).toBe(false);
  });

  it('тап открывает шит, выбор опции вызывает onChange и закрывает', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <Select value={null} onChange={onChange} options={OPTIONS} />,
    );
    await fireEvent.press(screen.getByRole('combobox'));
    await waitFor(() => {
      expect(screen.getByText('Москва')).toBeTruthy();
      expect(screen.getByText('Центральный склад')).toBeTruthy();
    });
    await fireEvent.press(screen.getByRole('radio', { name: 'Казань' }));
    expect(onChange).toHaveBeenCalledWith('kzn');
    await waitFor(() => {
      expect(screen.queryByText('Санкт-Петербург')).toBeNull();
    });
  });

  it('выбранная опция в шите — чекмарк и primary-текст', async () => {
    const screen = await render(
      <Select value="msk" onChange={jest.fn()} options={OPTIONS} />,
    );
    await fireEvent.press(screen.getByRole('combobox'));
    const option = await screen.findByRole('radio', { name: 'Москва' });
    expect(option.props.accessibilityState.selected).toBe(true);
  });

  it('disabled не открывает шит', async () => {
    const screen = await render(
      <Select value={null} onChange={jest.fn()} options={OPTIONS} disabled />,
    );
    const trigger = screen.getByRole('combobox');
    expect(trigger.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(trigger);
    await waitFor(() => {
      expect(screen.queryByText('Казань')).toBeNull();
    });
  });

  it('ошибка показывает текст под триггером', async () => {
    const screen = await render(
      <Select
        value={null}
        onChange={jest.fn()}
        options={OPTIONS}
        error="Выберите город доставки"
      />,
    );
    expect(screen.getByText('Выберите город доставки')).toBeTruthy();
  });

  it('пустой список — осмысленная подпись', async () => {
    const screen = await render(
      <Select value={null} onChange={jest.fn()} options={[]} />,
    );
    await fireEvent.press(screen.getByRole('combobox'));
    await waitFor(() => {
      expect(screen.getByText(/Список пуст/)).toBeTruthy();
    });
  });
});
