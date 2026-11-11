/**
 * Тесты ProductRow: название, состав количества, сумма строки.
 */
import { render } from '@testing-library/react-native';
import { NARROW_NBSP } from '../PriceDisplay';
import { ProductRow } from './ProductRow';

describe('ProductRow', () => {
  it('показывает название и количество × цену', async () => {
    const screen = await render(
      <ProductRow name="Молоко 3,2%" priceKopecks={8_900} quantity={2} />,
    );
    expect(screen.getByText('Молоко 3,2%')).toBeTruthy();
    expect(screen.getByText(`2 × 89${NARROW_NBSP}₽`)).toBeTruthy();
  });

  it('сумма строки = цена × количество', async () => {
    const screen = await render(
      <ProductRow name="Сыр «Гауда»" priceKopecks={55_000} quantity={3} />,
    );
    expect(screen.getByText(`1${NARROW_NBSP}650${NARROW_NBSP}₽`)).toBeTruthy();
  });

  it('единица измерения участвует в подписи доступности', async () => {
    const screen = await render(
      <ProductRow
        name="Картофель"
        priceKopecks={4_500}
        quantity={5}
        unit="кг"
      />,
    );
    expect(
      screen.getByLabelText(`Картофель, 5 кг, 225${NARROW_NBSP}₽`),
    ).toBeTruthy();
  });

  it('нулевое количество даёт нулевую сумму', async () => {
    const screen = await render(
      <ProductRow name="Лук" priceKopecks={3_000} quantity={0} />,
    );
    expect(screen.getByText(`0${NARROW_NBSP}₽`)).toBeTruthy();
  });
});
