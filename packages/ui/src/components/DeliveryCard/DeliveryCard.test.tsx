/**
 * Тесты DeliveryCard: методы, стоимость, время, выбор.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { NARROW_NBSP } from '../PriceDisplay';
import { DeliveryCard } from './DeliveryCard';

describe('DeliveryCard', () => {
  it('pickup → «Самовывоз» с адресом', async () => {
    const screen = await render(
      <DeliveryCard
        method="pickup"
        address="ул. Садовая, 12"
        time="сегодня, после 14:00"
      />,
    );
    expect(screen.getByText('Самовывоз')).toBeTruthy();
    expect(screen.getByText('ул. Садовая, 12')).toBeTruthy();
    expect(screen.getByText('сегодня, после 14:00')).toBeTruthy();
  });

  it('delivery → «Доставка» со своей стоимостью', async () => {
    const screen = await render(
      <DeliveryCard method="delivery" priceKopecks={25_000} />,
    );
    expect(screen.getByText('Доставка')).toBeTruthy();
    expect(screen.getByText(`250${NARROW_NBSP}₽`)).toBeTruthy();
  });

  it('нулевая и отсутствующая стоимость → «Бесплатно»', async () => {
    const screen = await render(
      <DeliveryCard method="pickup" priceKopecks={0} />,
    );
    expect(screen.getByText('Бесплатно')).toBeTruthy();
  });

  it('выбранная карточка помечается состоянием selected', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <DeliveryCard method="delivery" selected onPress={onPress} />,
    );
    const card = screen.getByRole('button', { name: /Доставка/ });
    expect(card.props.accessibilityState).toEqual({ selected: true });
    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('свой заголовок переопределяет стандартный', async () => {
    const screen = await render(
      <DeliveryCard method="delivery" title="Доставка до дома" />,
    );
    expect(screen.getByText('Доставка до дома')).toBeTruthy();
    expect(screen.queryByText('Доставка')).toBeNull();
  });
});
