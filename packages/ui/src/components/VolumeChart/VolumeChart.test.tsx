/**
 * Тесты VolumeChart — бар-чарта объёмов (Промт 18, D).
 */
import { render } from '@testing-library/react-native';
import { VolumeChart } from './VolumeChart';

describe('VolumeChart', () => {
  it('рисует товары со значениями и единицами', async () => {
    const screen = await render(
      <VolumeChart
        items={[
          { productName: 'Помидоры', quantity: 150, unit: 'кг' },
          { productName: 'Огурцы', quantity: 75, unit: 'кг' },
        ]}
      />,
    );
    expect(screen.getByText('Помидоры')).toBeTruthy();
    expect(screen.getByText('150 кг')).toBeTruthy();
    expect(screen.getByText('Огурцы')).toBeTruthy();
    expect(screen.getByText('75 кг')).toBeTruthy();
  });

  it('a11y-подписи с значениями', async () => {
    const screen = await render(
      <VolumeChart
        items={[{ productName: 'Морковь', quantity: 40, unit: 'кг' }]}
      />,
    );
    expect(screen.getByLabelText('Морковь: 40 кг')).toBeTruthy();
  });

  it('юнит seed «1 кг» показывается как «кг» (40 кг, не «40 1 кг»)', async () => {
    const screen = await render(
      <VolumeChart
        items={[{ productName: 'Морковь', quantity: 40, unit: '1 кг' }]}
      />,
    );
    expect(screen.getByText('40 кг')).toBeTruthy();
    expect(screen.queryByText('40 1 кг')).toBeNull();
  });
});
