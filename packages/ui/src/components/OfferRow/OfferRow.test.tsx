/**
 * Тесты OfferRow (Промт 10): фото/плейсхолдер, склад, бейдж,
 * табличная цена, архивное приглушение.
 */
import { render } from '@testing-library/react-native';
import { OfferRow } from './OfferRow';

describe('OfferRow', () => {
  it('показывает название, цену и склад', async () => {
    const screen = await render(
      <OfferRow
        title="Морковь мытая"
        unit="кг"
        priceKopecks={4500}
        stock={120}
        minQuantity={10}
      />,
    );
    expect(screen.getByText('Морковь мытая')).toBeTruthy();
    expect(screen.getByText(/45/)).toBeTruthy();
    expect(screen.getByText(/Склад: 120 кг · мин. 10 кг/)).toBeTruthy();
  });

  it('без фото — плейсхолдер с иконкой', async () => {
    const screen = await render(
      <OfferRow title="Тест" priceKopecks={100} stock={5} />,
    );
    expect(screen.getByLabelText('Фото не загружено')).toBeTruthy();
  });

  it('с фото — Image с этим URL', async () => {
    const screen = await render(
      <OfferRow
        title="Тест"
        priceKopecks={100}
        stock={5}
        imageUrl="https://cdn.example/p1.jpg"
      />,
    );
    expect(screen.getByLabelText('Фото: Тест').props.source.uri).toBe(
      'https://cdn.example/p1.jpg',
    );
  });

  it('бейдж hit отображается как «Хит»', async () => {
    const screen = await render(
      <OfferRow title="Тест" priceKopecks={100} stock={5} badge="hit" />,
    );
    expect(screen.getByText('Хит')).toBeTruthy();
  });

  it('нули склада не ломают подпись', async () => {
    const screen = await render(
      <OfferRow title="Тест" priceKopecks={100} stock={0} />,
    );
    expect(screen.getByText('Склад: 0')).toBeTruthy();
  });

  it('onPress делает ряд кнопкой с accessibilityLabel', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <OfferRow
        title="Тест"
        priceKopecks={100}
        stock={5}
        onPress={onPress}
        testID="offer-row"
      />,
    );
    expect(screen.getByTestId('offer-row')).toBeTruthy();
    expect(screen.getByLabelText(/Тест, Склад: 5/)).toBeTruthy();
  });
});
