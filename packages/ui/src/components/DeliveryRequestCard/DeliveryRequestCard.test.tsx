/**
 * Тесты DeliveryRequestCard (Промт 10, Часть D): маршрут,
 * груз, ставка, слот действий, статусы Badge и a11y.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { NARROW_NBSP } from '../PriceDisplay';
import { Text } from '../Text';
import { DeliveryRequestCard } from './DeliveryRequestCard';

const PROPS = {
  number: 'DL-2026-000001',
  status: 'PENDING' as const,
  pickupAddress: 'База Опт-Юг, ул. Шоссейная, 4',
  dropoffAddress: 'ул. Большая Садовая, 101',
  weightKg: 60,
  volumeL: 400,
  requesterName: 'Мария Петрова',
};

describe('DeliveryRequestCard', () => {
  it('показывает номер, инициатора и маршрут забора-выгрузки', async () => {
    const screen = await render(<DeliveryRequestCard {...PROPS} />);
    expect(screen.getByText('DL-2026-000001')).toBeTruthy();
    expect(screen.getByText('Мария Петрова')).toBeTruthy();
    expect(screen.getByText('Забор')).toBeTruthy();
    expect(screen.getByText('База Опт-Юг, ул. Шоссейная, 4')).toBeTruthy();
    expect(screen.getByText('Выгрузка')).toBeTruthy();
    expect(screen.getByText('ул. Большая Садовая, 101')).toBeTruthy();
  });

  it('груз: кг и литры табличными цифрами', async () => {
    const screen = await render(<DeliveryRequestCard {...PROPS} />);
    expect(screen.getByText('60 кг · 400 л')).toBeTruthy();
  });

  it('без груза — «Груз не указан»', async () => {
    const screen = await render(
      <DeliveryRequestCard {...PROPS} weightKg={null} volumeL={null} />,
    );
    expect(screen.getByText('Груз не указан')).toBeTruthy();
  });

  it('ставка после принятия отображается ценой', async () => {
    const screen = await render(
      <DeliveryRequestCard {...PROPS} status="ACCEPTED" priceKopecks={15000} />,
    );
    expect(screen.getByText(`150${NARROW_NBSP}₽`)).toBeTruthy();
  });

  it('статусы: PENDING — янтарный бейдж, COMPLETED — зелёный', async () => {
    const screen = await render(<DeliveryRequestCard {...PROPS} />);
    expect(screen.getByText('Ожидает перевозчика')).toBeTruthy();
    const done = await render(
      <DeliveryRequestCard {...PROPS} status="COMPLETED" />,
    );
    expect(done.getByText('Завершена')).toBeTruthy();
  });

  it('слот действий рендерится, нажатие вызывает onPress', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <DeliveryRequestCard {...PROPS} onPress={onPress}>
        <Text variant="bodySmall">Кнопка действия</Text>
      </DeliveryRequestCard>,
    );
    expect(screen.getByText('Кнопка действия')).toBeTruthy();
    fireEvent.press(
      screen.getByLabelText('Доставка DL-2026-000001, Ожидает перевозчика'),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('карточка без onPress — не кнопка (a11y)', async () => {
    const screen = await render(<DeliveryRequestCard {...PROPS} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
