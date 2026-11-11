/**
 * Тесты PriceDisplay: формат копеек в рубли, узкий неразрывный
 * пробел U+202F, табличные цифры, зачёркнутая цена и бейдж скидки.
 */
import { render } from '@testing-library/react-native';
import {
  NARROW_NBSP,
  PriceDisplay,
  discountPercent,
  formatPrice,
} from './PriceDisplay';

describe('formatPrice', () => {
  it('1250 рублей → «12 500 ₽» с U+202F', () => {
    expect(formatPrice(1_250_000)).toBe(`12${NARROW_NBSP}500${NARROW_NBSP}₽`);
  });

  it('копейки отображаются через запятую', () => {
    expect(formatPrice(12_550)).toBe(`125,50${NARROW_NBSP}₽`);
  });

  it('круглая сумма — без дробной части', () => {
    expect(formatPrice(300)).toBe(`3${NARROW_NBSP}₽`);
  });

  it('миллионы с разделителями групп', () => {
    expect(formatPrice(123_456_700)).toBe(
      `1${NARROW_NBSP}234${NARROW_NBSP}567${NARROW_NBSP}₽`,
    );
  });
});

describe('discountPercent', () => {
  it('скидка 15% считается от старой цены', () => {
    expect(discountPercent(85_000, 100_000)).toBe(15);
  });

  it('без скидки → 0', () => {
    expect(discountPercent(100_000, 100_000)).toBe(0);
    expect(discountPercent(120_000, 100_000)).toBe(0);
    expect(discountPercent(100, 0)).toBe(0);
  });
});

describe('PriceDisplay', () => {
  it('показывает цену', async () => {
    const screen = await render(<PriceDisplay value={89_000} />);
    expect(screen.getByText(`890${NARROW_NBSP}₽`)).toBeTruthy();
  });

  it('старая цена зачёркнута рядом с новой', async () => {
    const screen = await render(
      <PriceDisplay value={85_000} oldPrice={100_000} />,
    );
    const old = screen.getByText(`1${NARROW_NBSP}000${NARROW_NBSP}₽`);
    expect(old.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ textDecorationLine: 'line-through' }),
      ]),
    );
  });

  it('скидка → бейдж «−15%» варианта warning', async () => {
    const screen = await render(
      <PriceDisplay value={85_000} oldPrice={100_000} />,
    );
    expect(screen.getByText('−15%')).toBeTruthy();
  });

  it('равная старая цена — без бейджа скидки', async () => {
    const screen = await render(
      <PriceDisplay value={100_000} oldPrice={100_000} />,
    );
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('подпись доступности содержит обе цены', async () => {
    const screen = await render(
      <PriceDisplay value={85_000} oldPrice={100_000} />,
    );
    expect(
      screen.getByLabelText(
        `Цена: 850${NARROW_NBSP}₽, прежняя 1${NARROW_NBSP}000${NARROW_NBSP}₽`,
      ),
    ).toBeTruthy();
  });
});
