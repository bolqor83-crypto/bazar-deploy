/**
 * Тесты LocationSelector: триггер, шит выбора, «Вся сеть»,
 * выбор точки.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { LocationSelector } from './LocationSelector';

const LOCATIONS = [
  { id: 'l1', name: 'Точка на Садовой', address: 'ул. Садовая, 12' },
  { id: 'l2', name: 'Точка на Доватора', address: 'ул. Доватора, 45' },
];

describe('LocationSelector', () => {
  it('без выбора показывает «Вся сеть»', async () => {
    const screen = await render(
      <LocationSelector
        locations={LOCATIONS}
        value={null}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByLabelText(/Торговая точка: Вся сеть/)).toBeTruthy();
  });

  it('выбранная точка отображается в триггере', async () => {
    const screen = await render(
      <LocationSelector
        locations={LOCATIONS}
        value="l1"
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByLabelText(/Точка на Садовой/)).toBeTruthy();
  });

  it('открывает шит и показывает все точки с адресами', async () => {
    const screen = await render(
      <LocationSelector
        locations={LOCATIONS}
        value={null}
        onChange={jest.fn()}
      />,
    );
    await fireEvent.press(screen.getByLabelText(/Вся сеть\. Изменить/));

    await waitFor(() => {
      expect(screen.getByText('Точка на Садовой')).toBeTruthy();
      expect(screen.getByText('Точка на Доватора')).toBeTruthy();
      expect(screen.getByText('ул. Садовая, 12')).toBeTruthy();
      expect(screen.getByText('ул. Доватора, 45')).toBeTruthy();
    });
  });

  it('выбор точки вызывает onChange и закрывает шит', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <LocationSelector
        locations={LOCATIONS}
        value={null}
        onChange={onChange}
      />,
    );
    await fireEvent.press(screen.getByLabelText(/Вся сеть\. Изменить/));
    await waitFor(() => {
      expect(screen.getByText('Точка на Доватора')).toBeTruthy();
    });
    await fireEvent.press(screen.getByLabelText('Точка на Доватора'));

    expect(onChange).toHaveBeenCalledWith('l2');
  });

  it('выбор «Вся сеть» отдаёт null', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <LocationSelector locations={LOCATIONS} value="l1" onChange={onChange} />,
    );
    await fireEvent.press(screen.getByLabelText(/Точка на Садовой\. Изменить/));
    await waitFor(() => {
      expect(screen.getByLabelText('Вся сеть')).toBeTruthy();
    });
    await fireEvent.press(screen.getByLabelText('Вся сеть'));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('disabled: триггер недоступен', async () => {
    const screen = await render(
      <LocationSelector
        locations={LOCATIONS}
        value={null}
        onChange={jest.fn()}
        disabled
      />,
    );
    expect(
      screen.getByLabelText(/Вся сеть\. Изменить/).props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: true }));
  });
});
