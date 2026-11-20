/**
 * Тесты RouteStopRow — строки остановки (Промт 17, Часть B).
 *
 * Номер-бейдж, позиция на рынке, статус заказа, метры табличными
 * цифрами, чекбокс «Пройдено» 48×48, раздельные действия
 * (чекбокс не открывает заказ, строка не переключает чек).
 */
import { fireEvent, render } from '@testing-library/react-native';
import { RouteStopRow } from './RouteStopRow';

const PROPS = {
  index: 2,
  sellerName: 'Опт-Юг',
  row: 3,
  spot: 12,
  orderNumber: 'BZ-2026-000005',
  status: 'CONFIRMED' as const,
  itemsCount: 3,
  total: 45_600,
  legMeters: 120,
  visited: false,
  onToggleVisited: jest.fn(),
  onOpenOrder: jest.fn(),
};

describe('RouteStopRow', () => {
  beforeEach(() => {
    PROPS.onToggleVisited.mockClear();
    PROPS.onOpenOrder.mockClear();
  });

  it('показывает продавца, позицию, заказ и метры', async () => {
    const screen = await render(<RouteStopRow {...PROPS} />);
    expect(screen.getByText('Опт-Юг')).toBeTruthy();
    expect(screen.getByText('Ряд 3 · место 12')).toBeTruthy();
    expect(screen.getByText('BZ-2026-000005')).toBeTruthy();
    expect(screen.getByText('+120 м')).toBeTruthy();
    expect(screen.getByText(/3 поз\./)).toBeTruthy();
  });

  it('номер остановки на бейдже', async () => {
    const screen = await render(<RouteStopRow {...PROPS} />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('тап по строке открывает заказ', async () => {
    const screen = await render(<RouteStopRow {...PROPS} testID="stop-row" />);
    fireEvent.press(screen.getByTestId('stop-row'));
    expect(PROPS.onOpenOrder).toHaveBeenCalledTimes(1);
    expect(PROPS.onToggleVisited).not.toHaveBeenCalled();
  });

  it('чекбокс «Пройдено» — зона 48×48, переключает отметку', async () => {
    const screen = await render(<RouteStopRow {...PROPS} testID="stop-row" />);
    const checkbox = screen.getByTestId('stop-row-visited');
    const style = Object.assign(
      {},
      ...(Array.isArray(checkbox.props.style)
        ? checkbox.props.style
        : [checkbox.props.style]),
    );
    expect(style.width).toBe(48);
    expect(style.height).toBe(48);
    expect(checkbox.props.accessibilityRole).toBe('checkbox');
    expect(checkbox.props.accessibilityState).toMatchObject({ checked: false });
    fireEvent.press(checkbox);
    expect(PROPS.onToggleVisited).toHaveBeenCalledTimes(1);
    expect(PROPS.onOpenOrder).not.toHaveBeenCalled();
  });

  it('visited: чек вместо номера, состояние checked', async () => {
    const screen = await render(
      <RouteStopRow {...PROPS} visited testID="stop-row" />,
    );
    const checkbox = screen.getByTestId('stop-row-visited');
    expect(checkbox.props.accessibilityState).toMatchObject({ checked: true });
    // Номера на бейдже больше нет — вместо него чек.
    expect(screen.queryByText('2')).toBeNull();
  });

  it('a11y-подпись остановки', async () => {
    const screen = await render(<RouteStopRow {...PROPS} />);
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('Остановка 2: Опт-Юг, ряд 3, место 12');
  });
});
