/**
 * Тесты CartItemCard (Промт 9, Часть D): название, продавец,
 * партия, количество, сумма, удаление, a11y-подписи.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { NARROW_NBSP } from '../PriceDisplay';
import { CartItemCard } from './CartItemCard';

const PROPS = {
  name: 'Помидоры розовые',
  unit: '1 кг',
  sellerName: 'Опт-Юг',
  priceKopecks: 18_900,
  quantity: 10,
  minQuantity: 5,
  stock: 50,
  onQuantityChange: jest.fn(),
  onRemove: jest.fn(),
};

describe('CartItemCard', () => {
  beforeEach(() => {
    PROPS.onQuantityChange.mockClear();
    PROPS.onRemove.mockClear();
  });

  it('показывает название, продавца и сумму строки', async () => {
    const screen = await render(<CartItemCard {...PROPS} />);
    expect(screen.getByText('Помидоры розовые')).toBeTruthy();
    expect(screen.getByText('Опт-Юг · партия от 5 · 1 кг')).toBeTruthy();
    // 18 900 коп × 10 = 189 000 коп = 1 890 ₽
    expect(screen.getByText(`1${NARROW_NBSP}890${NARROW_NBSP}₽`)).toBeTruthy();
  });

  it('партия не показывается при minQuantity = 1', async () => {
    const screen = await render(<CartItemCard {...PROPS} minQuantity={1} />);
    expect(screen.getByText('Опт-Юг · 1 кг')).toBeTruthy();
  });

  it('без фото — силуэт продукции (Промт 16, A)', async () => {
    const screen = await render(
      <CartItemCard {...PROPS} silhouette="tomato" />,
    );
    expect(
      screen.getByLabelText('Помидоры розовые, фото отсутствует'),
    ).toBeTruthy();
  });

  it('a11y: подпись позиции содержит состав и сумму', async () => {
    const screen = await render(<CartItemCard {...PROPS} />);
    expect(
      screen.getByLabelText(
        `Позиция корзины: Помидоры розовые, 10 × 189${NARROW_NBSP}₽, сумма 1${NARROW_NBSP}890${NARROW_NBSP}₽`,
      ),
    ).toBeTruthy();
  });

  it('кнопка удаления вызывает onRemove с a11y-подписью', async () => {
    const screen = await render(<CartItemCard {...PROPS} />);
    fireEvent.press(screen.getByLabelText('Удалить Помидоры розовые'));
    expect(PROPS.onRemove).toHaveBeenCalledTimes(1);
  });

  it('«+» меняет количество через onQuantityChange', async () => {
    const screen = await render(<CartItemCard {...PROPS} />);
    fireEvent.press(screen.getByLabelText('Увеличить количество'));
    expect(PROPS.onQuantityChange).toHaveBeenCalledWith(11);
  });
});
