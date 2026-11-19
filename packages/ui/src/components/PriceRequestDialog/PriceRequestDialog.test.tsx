/**
 * Тесты «цены по запросу» (Промт 16, Часть C):
 * ProductCard скрывает цену и корзинные действия,
 * ProductDetailCard показывает приглашение, CartItemCard —
 * персональную цену и истёкший срок, PriceRequestDialog — форму.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { NARROW_NBSP } from '../PriceDisplay';
import { ProductCard } from '../ProductCard';
import { ProductDetailCard } from '../ProductDetailCard';
import { CartItemCard } from '../CartItemCard';
import { PriceRequestDialog } from './PriceRequestDialog';

describe('ProductCard: цена по запросу (Промт 16, C)', () => {
  it('null-цена — подпись «Цена по запросу», кнопки «+» нет', async () => {
    const onAddToCart = jest.fn();
    const screen = await render(
      <ProductCard
        name="Картофель продовольственный"
        priceKopecks={null}
        priceOnRequest
        unit="1 кг"
        onAddToCart={onAddToCart}
      />,
    );
    expect(screen.getByTestId('product-price-on-request')).toBeTruthy();
    expect(screen.getByText('Цена по запросу')).toBeTruthy();
    // Корзинное действие скрыто: без персонального предложения
    // добавить нельзя.
    expect(screen.queryByTestId('product-quick-add')).toBeNull();
  });

  it('priceOnRequest без явного null — та же подпись', async () => {
    const screen = await render(
      <ProductCard name="Хурма" priceKopecks={null} />,
    );
    expect(screen.getByText('Цена по запросу')).toBeTruthy();
  });

  it('обычная цена — как раньше, без подписи', async () => {
    const screen = await render(
      <ProductCard name="Молоко 3,2%" priceKopecks={8_900} unit="1 л" />,
    );
    expect(screen.queryByTestId('product-price-on-request')).toBeNull();
    expect(screen.getByText(`89${NARROW_NBSP}₽`)).toBeTruthy();
  });
});

describe('ProductDetailCard: цена по запросу (Промт 16, C)', () => {
  it('все офферы POR — заголовок вместо цены, «по запросу» в списке', async () => {
    const screen = await render(
      <ProductDetailCard
        name="Картофель продовольственный"
        unit="1 кг"
        priceKopecks={null}
        stock="in"
        sellerName="Опт-Юг"
        offers={[
          {
            id: 'offer-1',
            organizationName: 'Опт-Юг',
            priceKopecks: null,
            stock: 40,
            minQuantity: 10,
          },
          {
            id: 'offer-2',
            organizationName: 'Опт-Север',
            priceKopecks: null,
            stock: 25,
            minQuantity: 10,
          },
        ]}
      />,
    );
    expect(screen.getByTestId('detail-price-on-request')).toBeTruthy();
    // Список офферов: обе строки «по запросу».
    expect(screen.getAllByText('по запросу')).toHaveLength(2);
  });

  it('смешанные офферы: цена есть, POR-строка — «по запросу»', async () => {
    const screen = await render(
      <ProductDetailCard
        name="Картофель продовольственный"
        unit="1 кг"
        priceKopecks={35_000}
        stock="in"
        sellerName="Сеть «У дома»"
        offers={[
          {
            id: 'offer-open',
            organizationName: 'Сеть «У дома»',
            priceKopecks: 35_000,
            stock: 10,
            minQuantity: 2,
          },
          {
            id: 'offer-por',
            organizationName: 'Опт-Юг',
            priceKopecks: null,
            stock: 40,
            minQuantity: 10,
          },
        ]}
      />,
    );
    expect(screen.queryByTestId('detail-price-on-request')).toBeNull();
    // Главная цена и строка оффера — обе «350 ₽».
    expect(screen.getAllByText(`350${NARROW_NBSP}₽`)).toHaveLength(2);
    expect(screen.getByText('по запросу')).toBeTruthy();
  });
});

describe('CartItemCard: персональная цена (Промт 16, C)', () => {
  const base = {
    name: 'Картофель',
    unit: '1 кг',
    sellerName: 'Опт-Юг',
    quantity: 20,
    minQuantity: 10,
    stock: 100,
    onQuantityChange: jest.fn(),
    onRemove: jest.fn(),
  };

  it('бейдж «Персональная цена» и сумма по quote', async () => {
    const screen = await render(
      <CartItemCard
        {...base}
        priceKopecks={22_000}
        quote={{
          id: 'quote-1',
          priceKopecks: 22_000,
          expired: false,
          validUntil: new Date('2026-11-21T12:00:00Z'),
        }}
      />,
    );
    expect(screen.getByText('Персональная цена')).toBeTruthy();
    // 220 ₽ × 20 = 4 400 ₽.
    expect(screen.getByText(`4${NARROW_NBSP}400${NARROW_NBSP}₽`)).toBeTruthy();
    expect(screen.queryByTestId('cart-quote-expired')).toBeNull();
  });

  it('истёкший quote — предупреждение', async () => {
    const screen = await render(
      <CartItemCard
        {...base}
        priceKopecks={22_000}
        quote={{
          id: 'quote-1',
          priceKopecks: 22_000,
          expired: true,
          validUntil: new Date('2026-11-10T12:00:00Z'),
        }}
      />,
    );
    expect(screen.getByTestId('cart-quote-expired')).toBeTruthy();
    expect(
      screen.getByText('Срок персональной цены истёк — создайте новый запрос'),
    ).toBeTruthy();
  });

  it('без quote — как раньше, без бейджа', async () => {
    const screen = await render(
      <CartItemCard {...base} priceKopecks={25_000} />,
    );
    expect(screen.queryByText('Персональная цена')).toBeNull();
  });
});

describe('PriceRequestDialog (Промт 16, C)', () => {
  it('отправляет количество и сообщение, сбрасывает при повторном открытии', async () => {
    const onSubmit = jest.fn();
    const onClose = jest.fn();
    const screen = await render(
      <PriceRequestDialog
        visible
        onClose={onClose}
        productName="Картофель"
        minQuantity={10}
        stock={100}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByText('Запросить цену')).toBeTruthy();
    expect(
      screen.getByText(
        'Картофель: продавец ответит персональной ценой — она будет действовать 72 часа.',
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByTestId('price-request-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ quantity: 10, message: '' });

    // Сообщение попадает в отправку.
    await fireEvent.changeText(
      screen.getByTestId('price-request-message'),
      'Нужна отгрузка до пятницы',
    );
    await fireEvent.press(screen.getByTestId('price-request-submit'));
    expect(onSubmit).toHaveBeenLastCalledWith({
      quantity: 10,
      message: 'Нужна отгрузка до пятницы',
    });
  });

  it('submitting блокирует повторную отправку', async () => {
    const onSubmit = jest.fn();
    const screen = await render(
      <PriceRequestDialog
        visible
        onClose={() => {}}
        productName="Картофель"
        minQuantity={10}
        stock={100}
        onSubmit={onSubmit}
        submitting
      />,
    );
    const button = screen.getByTestId('price-request-submit');
    expect(button.props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByText('Отправляем…')).toBeTruthy();
  });
});
