/**
 * Тесты ProductCard: название, цена, наличие, единица, нажатие.
 * Промт 14b: фото 1:1 и shadow sm (Card default) во всех режимах.
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

  it('фото — квадрат 1:1 в обычном режиме (Промт 14b)', async () => {
    const screen = await render(
      <ProductCard name="Молоко 3,2%" priceKopecks={8_900} />,
    );
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"aspectRatio":1');
    expect(json).not.toContain('"height":96');
  });

  it('обёртка — Card default: shadow sm, без border (Промт 14b)', async () => {
    const screen = await render(
      <ProductCard name="Молоко 3,2%" priceKopecks={8_900} testID="pc" />,
    );
    const style = Object.assign(
      {},
      ...[screen.getByTestId('pc').props.style].flat(Infinity),
    ) as Record<string, unknown>;
    expect(style.elevation).toBe(2); // shadows.sm
    expect(style.borderWidth).toBeUndefined();
  });

  it('бейдж поверх фото с отступом sm (Промт 14b)', async () => {
    const screen = await render(
      <ProductCard name="Молоко 3,2%" priceKopecks={8_900} isPerishable />,
    );
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"top":8'); // spacing.sm
    expect(screen.getByText('Скоропорт')).toBeTruthy();
  });

  it('цена и юнит — двумя этажами, не обрезаются (Промт 14b)', async () => {
    const screen = await render(
      <ProductCard
        name="Манго"
        priceKopecks={1_234_00}
        unit="кг"
        onAddToCart={() => {}}
      />,
    );
    // Цена и «за кг» — отдельные узлы: перенос вместо обрезки.
    expect(screen.getByText(`1\u202F234${NARROW_NBSP}₽`)).toBeTruthy();
    expect(screen.getByText('за кг')).toBeTruthy();
  });

  it('onPress делает карточку кнопкой и вызывается', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <ProductCard name="Кефир" priceKopecks={6_900} onPress={onPress} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: /Кефир/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  describe('compact (Промт 14a)', () => {
    it('ширина 160 и плотный padding md=16 вместо стандартных 168/lg', async () => {
      const screen = await render(
        <ProductCard
          compact
          name="Бананы"
          priceKopecks={8_900}
          unit="1 кг"
          testID="compact-card"
        />,
      );
      const card = screen.getByTestId('compact-card');
      const flat = [card.props.style].flat(Infinity);
      const style = Object.assign({}, ...flat) as Record<string, unknown>;
      expect(style.width).toBe(160);
      expect(style.padding).toBe(16); // spacing.md — решение 14b
    });

    it('фото — квадрат 1:1 и скругление md', async () => {
      const screen = await render(
        <ProductCard compact name="Бананы" priceKopecks={8_900} />,
      );
      const json = JSON.stringify(screen.toJSON());
      expect(json).toContain('"aspectRatio":1');
    });

    it('badge рендерится одним нейтральным бейджем', async () => {
      const screen = await render(
        <ProductCard
          compact
          name="Бананы"
          priceKopecks={8_900}
          badge="Скоропорт"
        />,
      );
      expect(screen.getByText('Скоропорт')).toBeTruthy();
      expect(screen.queryByText('Хит')).toBeNull();
    });

    it('корзинные действия не рендерятся в compact', async () => {
      const screen = await render(
        <ProductCard
          compact
          name="Бананы"
          priceKopecks={8_900}
          onAddToCart={() => {}}
        />,
      );
      expect(screen.queryByTestId('product-quick-add')).toBeNull();
    });

    it('цена и юнит в одну строку: «89 ₽ / 1 кг»', async () => {
      const screen = await render(
        <ProductCard compact name="Бананы" priceKopecks={8_900} unit="1 кг" />,
      );
      expect(screen.getByText(`89${NARROW_NBSP}₽`)).toBeTruthy();
      expect(screen.getByText('/ 1 кг')).toBeTruthy();
    });

    it('onPress работает и в compact (зона нажатия — вся карточка)', async () => {
      const onPress = jest.fn();
      const screen = await render(
        <ProductCard
          compact
          name="Бананы"
          priceKopecks={8_900}
          onPress={onPress}
        />,
      );
      await fireEvent.press(screen.getByRole('button', { name: /Бананы/ }));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});
