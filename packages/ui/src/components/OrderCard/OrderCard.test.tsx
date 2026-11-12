/**
 * Тесты OrderCard (Промт 9, Часть E): номер, дата, статус,
 * превью позиций со «+N», итог, нажатие.
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

  it('превью: 3 заглушки + бейдж «+2» при 5 позициях', async () => {
    const screen = await render(<OrderCard {...PROPS} />);
    expect(screen.getByLabelText('Позиция 1')).toBeTruthy();
    expect(screen.getByLabelText('Позиция 3')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy();
  });

  it('нажатие вызывает onPress с a11y-подписью', async () => {
    const screen = await render(<OrderCard {...PROPS} />);
    fireEvent.press(screen.getByLabelText(/Заказ BZ-2026-000123/));
    expect(PROPS.onPress).toHaveBeenCalledTimes(1);
  });
});
