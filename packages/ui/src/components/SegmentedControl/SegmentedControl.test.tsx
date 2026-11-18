/**
 * Тесты SegmentedControl (Промт 15, Часть E).
 */
import { fireEvent, render } from '@testing-library/react-native';
import { SegmentedControl } from './SegmentedControl';

const OPTIONS = [
  { value: 'grouped', label: 'По продавцам' },
  { value: 'chronological', label: 'По дате' },
] as const;

describe('SegmentedControl (Промт 15, E)', () => {
  it('рендерит обе опции, активная помечена selected', async () => {
    const screen = await render(
      <SegmentedControl
        options={OPTIONS}
        value="grouped"
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('По продавцам')).toBeTruthy();
    expect(screen.getByLabelText('По дате')).toBeTruthy();
    expect(
      screen.getByLabelText('По продавцам').props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      screen.getByLabelText('По дате').props.accessibilityState,
    ).toMatchObject({ selected: false });
  });

  it('выбор вызывает onChange с новым значением', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <SegmentedControl
        options={OPTIONS}
        value="grouped"
        onChange={onChange}
      />,
    );
    await fireEvent.press(screen.getByLabelText('По дате'));
    expect(onChange).toHaveBeenCalledWith('chronological');
  });

  it('повторное нажатие активного сегмента не вызывает onChange', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <SegmentedControl
        options={OPTIONS}
        value="grouped"
        onChange={onChange}
      />,
    );
    await fireEvent.press(screen.getByLabelText('По продавцам'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('компактная высота 32 (шапка списков)', async () => {
    const screen = await render(
      <SegmentedControl
        options={OPTIONS}
        value="grouped"
        onChange={jest.fn()}
      />,
    );
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"height":32');
  });
});
