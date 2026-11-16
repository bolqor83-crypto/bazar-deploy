/**
 * Тесты StockRow (Промт 11b): остаток крупно, раскладка резерва,
 * индикатор уровня, плейсхолдер фото, кнопка-строка.
 */
import { render } from '@testing-library/react-native';
import { StockRow, formatQuantity } from './StockRow';

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

  it('мультипакет («100 г») — число крупно, пак под ним', async () => {
    const screen = await render(
      <StockRow {...BASE} unit="100 г" physicalQty={166} reservedQty={0} />,
    );
    expect(screen.getByText('166')).toBeTruthy();
    expect(screen.getByText('× 100 г')).toBeTruthy();
  });

  it('без фото — плейсхолдер с подписью', async () => {
    const screen = await render(<StockRow {...BASE} imageUrl={null} />);
    expect(screen.getByLabelText('Фото не загружено')).toBeTruthy();
  });
});

describe('formatQuantity', () => {
  it('юнит «1 кг» сворачивается: 75 → «75 кг»', () => {
    expect(formatQuantity(75, '1 кг')).toBe('75 кг');
  });

  it('юнит-мультипакет: 166 → «166 × 100 г»', () => {
    expect(formatQuantity(166, '100 г')).toBe('166 × 100 г');
  });

  it('обычный юнит: 12 → «12 шт»', () => {
    expect(formatQuantity(12, 'шт')).toBe('12 шт');
  });

  it('без юнита — просто число', () => {
    expect(formatQuantity(7)).toBe('7');
  });
});
