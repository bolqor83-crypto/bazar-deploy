/**
 * Тесты TopProductsList — топ товаров по объёму (Промт 18, D).
 */
import { render } from '@testing-library/react-native';
import { TopProductsList } from './TopProductsList';

describe('TopProductsList', () => {
  it('нумерует места и показывает количества', async () => {
    const screen = await render(
      <TopProductsList
        items={[
          {
            productName: 'Помидоры',
            quantity: 150,
            unit: 'кг',
            ordersCount: 6,
          },
          {
            productName: 'Огурцы',
            quantity: 90,
            unit: 'кг',
            ordersCount: 3,
          },
        ]}
      />,
    );
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('Помидоры')).toBeTruthy();
    expect(screen.getByText('150 кг')).toBeTruthy();
    expect(screen.getByText('6 зак.')).toBeTruthy();
  });

  it('a11y-подпись места', async () => {
    const screen = await render(
      <TopProductsList
        items={[
          {
            productName: 'Лук',
            quantity: 20,
            unit: 'кг',
            ordersCount: 1,
          },
        ]}
      />,
    );
    expect(screen.getByLabelText('Место 1: Лук, 20 кг')).toBeTruthy();
  });
});
