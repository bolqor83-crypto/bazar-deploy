/**
 * Тесты StockIndicator: подписи уровней наличия и доступность.
 */
import { render } from '@testing-library/react-native';
import { StockIndicator } from './StockIndicator';

describe('StockIndicator', () => {
  it('in → «В наличии»', async () => {
    const screen = await render(<StockIndicator stock="in" />);
    expect(screen.getByText('В наличии')).toBeTruthy();
    expect(screen.getByLabelText('Наличие: В наличии')).toBeTruthy();
  });

  it('low → «Заканчивается»', async () => {
    const screen = await render(<StockIndicator stock="low" />);
    expect(screen.getByText('Заканчивается')).toBeTruthy();
  });

  it('out → «Нет в наличии»', async () => {
    const screen = await render(<StockIndicator stock="out" />);
    expect(screen.getByText('Нет в наличии')).toBeTruthy();
  });

  it('все уровни рендерятся с точкой-индикатором', async () => {
    for (const stock of ['in', 'low', 'out'] as const) {
      const screen = await render(<StockIndicator stock={stock} />);
      expect(screen.toJSON()).toBeTruthy();
      expect(screen.toJSON()?.children).toHaveLength(2);
    }
  });
});
