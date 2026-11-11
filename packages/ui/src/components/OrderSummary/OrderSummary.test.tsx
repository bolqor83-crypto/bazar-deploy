/**
 * Тесты OrderSummary: позиции, итог, явная сумма.
 */
import { render } from '@testing-library/react-native';
import { NARROW_NBSP } from '../PriceDisplay';
import { OrderSummary } from './OrderSummary';

const ITEMS = [
  { name: 'Молоко 3,2%', priceKopecks: 8_900, quantity: 2, unit: 'л' },
  { name: 'Сыр «Гауда»', priceKopecks: 55_000, quantity: 1 },
];

describe('OrderSummary', () => {
  it('показывает все позиции как ProductRow', async () => {
    const screen = await render(<OrderSummary items={ITEMS} />);
    expect(screen.getByText('Молоко 3,2%')).toBeTruthy();
    expect(screen.getByText('Сыр «Гауда»')).toBeTruthy();
  });

  it('итог = сумма по позициям, когда не задан явно', async () => {
    const screen = await render(<OrderSummary items={ITEMS} />);
    // 2×89 + 550 = 728 ₽
    expect(screen.getByText(`728${NARROW_NBSP}₽`)).toBeTruthy();
    expect(screen.getByLabelText(`Итого: 728${NARROW_NBSP}₽`)).toBeTruthy();
  });

  it('явный итог переопределяет сумму позиций (доставка)', async () => {
    const screen = await render(
      <OrderSummary items={ITEMS} totalKopecks={77_800} />,
    );
    expect(screen.getByText(`778${NARROW_NBSP}₽`)).toBeTruthy();
  });

  it('пустой список — итог 0 ₽', async () => {
    const screen = await render(<OrderSummary items={[]} />);
    expect(screen.getByText(`0${NARROW_NBSP}₽`)).toBeTruthy();
    expect(screen.getByText('Итого')).toBeTruthy();
  });
});
