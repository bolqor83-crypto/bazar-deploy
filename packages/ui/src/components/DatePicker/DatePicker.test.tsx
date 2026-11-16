/**
 * Тесты DatePicker (Промт 12, Часть C): триггер с датой, календарь,
 * выбор дня, «Сегодня», min/max, «Применить»/«Отмена», a11y.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { DatePicker, formatDateRu } from './DatePicker';

describe('DatePicker', () => {
  it('триггер показывает выбранную дату dd.mm.yyyy', async () => {
    const screen = await render(
      <DatePicker value={new Date(2026, 10, 15)} onChange={jest.fn()} />,
    );
    expect(screen.getByText('15.11.2026')).toBeTruthy();
  });

  it('без значения — маска и подсказка доступности', async () => {
    const screen = await render(
      <DatePicker value={null} onChange={jest.fn()} label="Дата доставки" />,
    );
    expect(screen.getByText('ДД.ММ.ГГГГ')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Дата доставки: дата не выбрана' }),
    ).toBeTruthy();
  });

  it('открывает календарь, выбор дня и «Применить» вызывают onChange', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <DatePicker value={new Date(2026, 10, 15)} onChange={onChange} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: '15.11.2026' }));
    await waitFor(() => {
      expect(screen.getByText('Ноябрь 2026')).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId('day-2026-11-18'));
    await fireEvent.press(screen.getByTestId('datepicker-apply'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const picked = onChange.mock.calls[0][0] as Date;
    expect(formatDateRu(picked)).toBe('18.11.2026');
  });

  it('«Отмена» не вызывает onChange', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <DatePicker value={new Date(2026, 10, 15)} onChange={onChange} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: '15.11.2026' }));
    await waitFor(() => {
      expect(screen.getByTestId('datepicker-cancel')).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId('day-2026-11-18'));
    await fireEvent.press(screen.getByTestId('datepicker-cancel'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('«Сегодня» выбирает текущую дату и применяет её', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <DatePicker value={null} onChange={onChange} />,
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Выберите дату' }),
    );
    await waitFor(() => {
      expect(screen.getByTestId('datepicker-today')).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId('datepicker-today'));
    await fireEvent.press(screen.getByTestId('datepicker-apply'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('дни вне min/max недоступны', async () => {
    const screen = await render(
      <DatePicker
        value={new Date(2026, 10, 15)}
        onChange={jest.fn()}
        min={new Date(2026, 10, 10)}
        max={new Date(2026, 10, 20)}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: '15.11.2026' }));
    await waitFor(() => {
      expect(
        screen.getByTestId('day-2026-11-05').props.accessibilityState.disabled,
      ).toBe(true);
      expect(
        screen.getByTestId('day-2026-11-15').props.accessibilityState.disabled,
      ).toBe(false);
      expect(
        screen.getByTestId('day-2026-11-25').props.accessibilityState.disabled,
      ).toBe(true);
    });
  });

  it('навигация месяцев переключает заголовок', async () => {
    const screen = await render(
      <DatePicker value={new Date(2026, 10, 15)} onChange={jest.fn()} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: '15.11.2026' }));
    await waitFor(() => {
      expect(screen.getByText('Ноябрь 2026')).toBeTruthy();
    });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Предыдущий месяц' }),
    );
    await waitFor(() => {
      expect(screen.getByText('Октябрь 2026')).toBeTruthy();
    });
    await fireEvent.press(
      screen.getByRole('button', { name: 'Следующий месяц' }),
    );
    await waitFor(() => {
      expect(screen.getByText('Ноябрь 2026')).toBeTruthy();
    });
  });

  it('день недели и дни месяца — подписи доступности', async () => {
    const screen = await render(
      <DatePicker value={new Date(2026, 10, 15)} onChange={jest.fn()} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: '15.11.2026' }));
    await waitFor(() => {
      expect(screen.getByText('Пн')).toBeTruthy();
      expect(screen.getByTestId('day-2026-11-02')).toBeTruthy();
    });
  });
});
