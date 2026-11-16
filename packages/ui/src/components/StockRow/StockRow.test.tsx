/**
 * Тесты StockRow (Промт 11b): остаток крупно, раскладка резерва,
 * индикатор уровня, плейсхолдер фото, кнопка-строка.
 */
import { render } from '@testing-library/react-native';
import { StockRow } from './StockRow';

const BASE = {
  title: 'Огурцы гладкие',
  unit: 'кг',
  priceKopecks: 4500,
  minQuantity: 5,
  physicalQty: 120,
  reservedQty: 5,
  availableQty: 115,
  imageUrl: null,
};

describe('StockRow', () => {
  it('показывает остаток крупно с единицей и раскладку резерва', async () => {
    const screen = await render(<StockRow {...BASE} />);
    expect(screen.getByText('120 кг')).toBeTruthy();
    expect(screen.getByText('Резерв: 5 · Доступно: 115')).toBeTruthy();
    // formatPrice(4500) → «45 ₽» (узкий пробел U+202F).
    expect(screen.getByText(/₽\/кг/)).toBeTruthy();
  });

  it('без резерва не дублирует доступно под остатком', async () => {
    const screen = await render(
      <StockRow {...BASE} reservedQty={0} availableQty={120} />,
    );
    // Доступно = физическому: дубль числа под остатком не нужен.
    expect(screen.queryByText(/Доступно/)).toBeNull();
    expect(screen.queryByText(/Резерв/)).toBeNull();
    expect(screen.getByText('120 кг')).toBeTruthy();
  });

  it('уровень «мало» когда доступно меньше двух минимальных партий', async () => {
    // minQuantity 5 → порог 10; доступно 8 — «Заканчивается».
    const screen = await render(<StockRow {...BASE} availableQty={8} />);
    expect(screen.getByLabelText('Заканчивается')).toBeTruthy();
  });

  it('уровень «нет в наличии» при нулевом доступном', async () => {
    const screen = await render(
      <StockRow {...BASE} physicalQty={5} reservedQty={5} availableQty={0} />,
    );
    expect(screen.getByLabelText('Нет в наличии')).toBeTruthy();
  });

  it('уровень «в наличии» при достаточном остатке', async () => {
    const screen = await render(<StockRow {...BASE} />);
    expect(screen.getByLabelText('В наличии')).toBeTruthy();
  });

  it('строка-кнопка с accessibilityLabel остатка', async () => {
    const screen = await render(
      <StockRow {...BASE} onPress={() => undefined} testID="stock-row-1" />,
    );
    expect(screen.getByTestId('stock-row-1')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Огурцы гладкие, остаток 120 кг, Резерв: 5 · Доступно: 115',
      }),
    ).toBeTruthy();
  });

  it('без фото — плейсхолдер с подписью', async () => {
    const screen = await render(<StockRow {...BASE} imageUrl={null} />);
    expect(screen.getByLabelText('Фото не загружено')).toBeTruthy();
  });
});
