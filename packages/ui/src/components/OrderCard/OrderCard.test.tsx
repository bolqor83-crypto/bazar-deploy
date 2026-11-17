/**
 * Тесты OrderCard (Промт 9, Часть E): номер, дата, статус,
 * сводка состава заказа (Промт 12, доработка), итог, нажатие.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { NARROW_NBSP } from '../PriceDisplay';
import { OrderCard } from './OrderCard';

const PROPS = {
  number: 'BZ-2026-000123',
  status: 'PENDING' as const,
  createdAt: '2026-11-12T05:30:00Z',
  itemCount: 5,
  totalKopecks: 189_000,
  sellerName: 'Опт-Юг',
  onPress: jest.fn(),
};

describe('OrderCard', () => {
  beforeEach(() => {
    PROPS.onPress.mockClear();
  });

  it('показывает номер, продавца и итог', async () => {
    const screen = await render(<OrderCard {...PROPS} />);
    expect(screen.getByText('BZ-2026-000123')).toBeTruthy();
    expect(screen.getByText(/Опт-Юг/)).toBeTruthy();
    expect(screen.getByText(`1${NARROW_NBSP}890${NARROW_NBSP}₽`)).toBeTruthy();
  });

  it('статус PENDING — «Новый»', async () => {
    const screen = await render(<OrderCard {...PROPS} />);
    expect(screen.getByText('Новый')).toBeTruthy();
  });

  it('статус CANCELLED — «Отменён»', async () => {
    const screen = await render(<OrderCard {...PROPS} status="CANCELLED" />);
    expect(screen.getByText('Отменён')).toBeTruthy();
  });

  it('сводка состава: две позиции с количеством + «ещё N»', async () => {
    const screen = await render(
      <OrderCard
        {...PROPS}
        items={[
          { title: 'Огурцы гладкие', quantity: 12, unit: 'кг' },
          { title: 'Помидоры розовые', quantity: 5, unit: 'кг' },
          { title: 'Зелень', quantity: 3, unit: 'шт' },
        ]}
      />,
    );
    expect(
      screen.getByText(
        'Огурцы гладкие 12 × кг · Помидоры розовые 5 × кг · ещё 3',
      ),
    ).toBeTruthy();
  });

  it('без состава — количество позиций текстом', async () => {
    const screen = await render(<OrderCard {...PROPS} />);
    expect(screen.getByText('5 позиций')).toBeTruthy();
  });

  it('нажатие вызывает onPress с a11y-подписью', async () => {
    const screen = await render(<OrderCard {...PROPS} />);
    fireEvent.press(screen.getByLabelText(/Заказ BZ-2026-000123/));
    expect(PROPS.onPress).toHaveBeenCalledTimes(1);
  });
});
