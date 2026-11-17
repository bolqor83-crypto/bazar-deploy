/**
 * Тесты ProductCard: название, цена, наличие, единица, нажатие.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { NARROW_NBSP } from '../PriceDisplay';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  it('показывает название, цену и единицу', async () => {
    const screen = await render(
      <ProductCard name="Молоко 3,2%" priceKopecks={8_900} unit="1 л" />,
    );
    expect(screen.getByText('Молоко 3,2%')).toBeTruthy();
    expect(screen.getByText(`89${NARROW_NBSP}₽`)).toBeTruthy();
    // Юнит — под ценой «за 1 л» (VLM-аудит итерации 3: строка
    // «89 ₽ / 1 л» в одну строку съедалась кнопкой «+»).
    expect(screen.getByText('за 1 л')).toBeTruthy();
    expect(screen.queryByText('/ 1 л')).toBeNull();
  });

  it('юнит уходит под цену при быстром добавлении', async () => {
    const screen = await render(
      <ProductCard
        name="Грецкий орех"
        priceKopecks={49_000}
        unit="500 г"
        onAddToCart={() => {}}
      />,
    );
    expect(screen.getByText('за 500 г')).toBeTruthy();
    expect(screen.queryByText('/ 500 г')).toBeNull();
  });

  it('товар в корзине показывает мини-степпер вместо «+»', async () => {
    const onIncrement = jest.fn();
    const onDecrement = jest.fn();
    const screen = await render(
      <ProductCard
        name="Огурцы гладкие"
        priceKopecks={12_300}
        unit="1 кг"
        quantityInCart={2}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onAddToCart={() => {}}
      />,
    );
    expect(screen.getByTestId('product-in-cart-stepper')).toBeTruthy();
    expect(screen.queryByTestId('product-quick-add')).toBeNull();
    expect(screen.getByText('2')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('product-increment'));
    expect(onIncrement).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('product-decrement'));
    expect(onDecrement).toHaveBeenCalledTimes(1);
  });

  it('наличие отображается индикатором', async () => {
    const screen = await render(
      <ProductCard name="Сыр» «Гауда»" priceKopecks={55_000} stock="low" />,
    );
    expect(screen.getByText('Заканчивается')).toBeTruthy();
  });

  it('без наличия индикатор не показывается', async () => {
    const screen = await render(
      <ProductCard name="Сметана" priceKopecks={7_500} />,
    );
    expect(screen.queryByText('В наличии')).toBeNull();
  });

  it('скидочная цена даёт бейдж процента', async () => {
    const screen = await render(
      <ProductCard
        name="Творог 9%"
        priceKopecks={12_750}
        oldPriceKopecks={15_000}
      />,
    );
    expect(screen.getByText('−15%')).toBeTruthy();
  });

  it('onPress делает карточку кнопкой и вызывается', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <ProductCard name="Кефир" priceKopecks={6_900} onPress={onPress} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: /Кефир/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
