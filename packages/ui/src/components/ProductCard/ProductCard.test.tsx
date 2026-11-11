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
    expect(screen.getByText('1 л')).toBeTruthy();
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
