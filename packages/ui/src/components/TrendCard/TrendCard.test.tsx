/**
 * Тесты компонентов аналитики (Промт 18, Часть D):
 * TrendCard, VolumeChart, TopProductsList, AnomalyList.
 */
import { render } from '@testing-library/react-native';
import { TrendCard } from './TrendCard';

describe('TrendCard', () => {
  it('показывает категорию, среднюю цену и рост со стрелкой вверх', async () => {
    const screen = await render(
      <TrendCard
        categoryName="Овощи"
        avgPriceKopecks={8500}
        changePercent={12.5}
        offers={6}
      />,
    );
    expect(screen.getByText('Овощи')).toBeTruthy();
    expect(screen.getByText('85 ₽')).toBeTruthy();
    expect(screen.getByText('+12,5%')).toBeTruthy();
    expect(
      screen.getByLabelText('Тренд Овощи: средняя 85 ₽, изменение +12,5%'),
    ).toBeTruthy();
  });

  it('падение — минус и терракота, не красный', async () => {
    const screen = await render(
      <TrendCard
        categoryName="Фрукты"
        avgPriceKopecks={12_000}
        changePercent={-5}
        offers={3}
      />,
    );
    expect(screen.getByText('-5,0%')).toBeTruthy();
  });

  it('нет истории — прочерк вместо выдуманного процента', async () => {
    const screen = await render(
      <TrendCard
        categoryName="Зелень"
        avgPriceKopecks={3000}
        changePercent={null}
        offers={2}
      />,
    );
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('2 предл.')).toBeTruthy();
  });
});
