/**
 * Тесты AnomalyList — списка аномалий (Промт 18, D).
 */
import { render } from '@testing-library/react-native';
import { AnomalyList } from './AnomalyList';

describe('AnomalyList', () => {
  it('пустой список — спокойная подпись', async () => {
    const screen = await render(<AnomalyList items={[]} />);
    expect(
      screen.getByText('Резких отклонений нет — рынок спокоен.'),
    ).toBeTruthy();
  });

  it('аномалии с типом, значением и отклонением', async () => {
    const screen = await render(
      <AnomalyList
        items={[
          {
            type: 'price_spike',
            entity: 'Овощи',
            value: 12_000,
            zScore: 2.4,
          },
          {
            type: 'volume_drop',
            entity: 'Помидоры',
            value: 5,
            zScore: -2.2,
            unit: 'кг',
          },
        ]}
      />,
    );
    expect(screen.getByText('Овощи')).toBeTruthy();
    expect(screen.getByText('Помидоры')).toBeTruthy();
    expect(screen.getByText(/120 ₽ · отклонение 2,4σ/)).toBeTruthy();
    expect(screen.getByText(/5 кг · отклонение -2,2σ/)).toBeTruthy();
    expect(screen.getByText('Цена ↑')).toBeTruthy();
    expect(screen.getByText('Объём ↓')).toBeTruthy();
  });
});
