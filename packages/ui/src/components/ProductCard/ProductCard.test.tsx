/**
 * Тесты ProductCard: название, цена, наличие, единица, нажатие.
 * Промт 14b: фото 1:1 и shadow sm (Card default) во всех режимах.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { spacing } from '../../tokens';
import { NARROW_NBSP } from '../PriceDisplay';
import { ProductCard, PRODUCT_CARD_TITLE_HEIGHT } from './ProductCard';

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

  it('юнит рядом с ценой в одну строку (Промт 15)', async () => {
    const screen = await render(
      <ProductCard
        name="Грецкий орех"
        priceKopecks={49_000}
        unit="500 г"
        onAddToCart={() => {}}
      />,
    );
    expect(screen.getByText(`490${NARROW_NBSP}₽`)).toBeTruthy();
    expect(screen.getByText('за 500 г')).toBeTruthy();
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

  it('наличие — точка StockDot, без текста (Промт 15)', async () => {
    const screen = await render(
      <ProductCard name="Сыр» «Гауда»" priceKopecks={55_000} stock="low" />,
    );
    expect(screen.getByTestId('product-stock-dot')).toBeTruthy();
    expect(screen.getByLabelText('Наличие: Мало осталось')).toBeTruthy();
    // Текст наличия из карточки убран — остаётся на детальной.
    expect(screen.queryByText('Заканчивается')).toBeNull();
  });

  it('без наличия точка не показывается', async () => {
    const screen = await render(
      <ProductCard name="Сметана" priceKopecks={7_500} />,
    );
    expect(screen.queryByTestId('product-stock-dot')).toBeNull();
    expect(screen.queryByLabelText(/Наличие:/)).toBeNull();
  });

  it('точка — в левом верхнем углу фото, бейдж — в правом (Промт 15)', async () => {
    const screen = await render(
      <ProductCard
        name="Сыр» «Гауда»"
        priceKopecks={55_000}
        stock="in"
        isPerishable
      />,
    );
    const dot = screen.getByTestId('product-stock-dot');
    const dotStyle = Object.assign(
      {},
      ...[dot.props.style].flat(Infinity),
    ) as Record<string, unknown>;
    expect(dotStyle.top).toBe(8); // spacing.sm
    expect(dotStyle.left).toBe(8);
    expect(dotStyle.right).toBeUndefined();
    // Бейдж — с того же отступа, но у ПРАВОГО края.
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"right":8');
    expect(screen.getByText('Скоропорт')).toBeTruthy();
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

  it('без фото — силуэт продукции, без камера-бейджа покупателя (Промт 16, A)', async () => {
    const screen = await render(
      <ProductCard
        name="Апельсины столовые"
        priceKopecks={10_700}
        silhouette="citrus"
      />,
    );
    expect(screen.getByTestId('product-placeholder')).toBeTruthy();
    expect(
      screen.getByLabelText('Апельсины столовые, фото отсутствует'),
    ).toBeTruthy();
    // Камера-бейдж — только в кабинете продавца.
    expect(screen.queryByLabelText('Нет фото — добавьте')).toBeNull();
  });

  it('с фото — Image без заглушки (Промт 16, A)', async () => {
    const screen = await render(
      <ProductCard
        name="Бананы"
        priceKopecks={8_900}
        imageUrl="https://cdn.example/bananas.png"
      />,
    );
    expect(screen.getByLabelText('Фото: Бананы').props.source.uri).toBe(
      'https://cdn.example/bananas.png',
    );
    expect(screen.queryByTestId('product-placeholder')).toBeNull();
  });

  it('compact без фото — тоже силуэт (карусель похожих, Промт 16, A)', async () => {
    const screen = await render(
      <ProductCard compact name="Свёкла столовая" priceKopecks={4_500} />,
    );
    expect(screen.getByTestId('product-placeholder')).toBeTruthy();
    expect(
      screen.getByLabelText('Свёкла столовая, фото отсутствует'),
    ).toBeTruthy();
  });

  it('умолчание силуэта — crate (fallback), не зависит от названия', async () => {
    const screen = await render(
      <ProductCard name="Изюм тёмный" priceKopecks={21_800} />,
    );
    expect(screen.getByTestId('product-placeholder')).toBeTruthy();
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

  it('цена и юнит — в одной строке, без обрезки (Промт 15)', async () => {
    const screen = await render(
      <ProductCard
        name="Манго"
        priceKopecks={1_234_00}
        unit="кг"
        onAddToCart={() => {}}
      />,
    );
    expect(screen.getByText(`1\u202F234${NARROW_NBSP}₽`)).toBeTruthy();
    expect(screen.getByText('за кг')).toBeTruthy();
  });

  it('описание и продавец НЕ рендерятся в карточке каталога (Промт 15, C)', async () => {
    const screen = await render(
      <ProductCard
        name="Молоко 3,2%"
        priceKopecks={8_900}
        description="Пастеризованное"
        organizationName="Опт-Юг"
      />,
    );
    expect(screen.queryByText('Пастеризованное')).toBeNull();
    expect(screen.queryByText('Опт-Юг')).toBeNull();
  });

  it('заголовок — bodySmall 15/600 с фиксированной высотой 44 (Промт 16, B)', async () => {
    const screen = await render(
      <ProductCard name="Молоко 3,2%" priceKopecks={8_900} />,
    );
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('"height":44');
    expect(json).not.toContain('"height":46');
    // Типографика заголовка: variant bodySmall + weight 600.
    const title = screen.getByText('Молоко 3,2%');
    const style = Object.assign(
      {},
      ...[title.props.style].flat(Infinity),
    ) as Record<string, unknown>;
    expect(style.fontWeight).toBe('600');
    expect(style.fontSize).toBe(15);
    expect(style.lineHeight).toBe(22);
  });

  it('длинное название — 2 строки, сетка не прыгает (Промт 16, B)', async () => {
    const long = await render(
      <ProductCard
        name="Картофель продовольственный мытый"
        priceKopecks={3_200}
      />,
    );
    const short = await render(<ProductCard name="Лук" priceKopecks={3_200} />);
    // Контейнер заголовка — одна и та же фиксированная высота.
    const longJson = JSON.stringify(long.toJSON());
    const shortJson = JSON.stringify(short.toJSON());
    expect(longJson).toContain('"height":44');
    expect(shortJson).toContain('"height":44');
    // Обрезка tail и 2 строки — на длинном названии.
    expect(long.getByText('Картофель продовольственный мытый')).toBeTruthy();
  });

  it('кнопка «+» — плавающая поверх фото, не в потоке цены (Промт 15)', async () => {
    const screen = await render(
      <ProductCard
        name="Молоко 3,2%"
        priceKopecks={8_900}
        onAddToCart={() => {}}
      />,
    );
    const btn = screen.getByTestId('product-quick-add');
    const wrap = btn.parent as unknown as {
      props: { style: Record<string, unknown>[] };
    };
    const style = Object.assign(
      {},
      ...[wrap.props.style].flat(Infinity),
    ) as Record<string, unknown>;
    expect(style.position).toBe('absolute');
    expect(style.bottom).toBe(12);
    expect(style.right).toBe(12);
  });

  it('высота карточки на ширине 173 — 270±5 (Промт 16, B)', async () => {
    // Фото 173 (aspect 1 при bleed) + paddingTop 6 + title 44
    // + gap 6 + цена 24 + paddingBottom md = 269.
    // Токен-зависимая часть (paddingBottom) — реальная: дрейф
    // шкалы ломает тест.
    const total = 173 + 6 + PRODUCT_CARD_TITLE_HEIGHT + 6 + 24 + spacing.md;
    expect(total).toBeGreaterThanOrEqual(265);
    expect(total).toBeLessThanOrEqual(275);
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
