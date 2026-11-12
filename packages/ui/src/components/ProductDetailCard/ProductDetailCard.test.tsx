/**
 * Тесты ProductDetailCard: бейджи, цена, партия, продавец, предложения.
 */
import { render } from '@testing-library/react-native';
import { NARROW_NBSP } from '../PriceDisplay';
import {
  ProductDetailCard,
  stockLevelFor,
  unitShort,
} from './ProductDetailCard';

const BASE = {
  name: 'Помидоры розовые',
  unit: '1 кг',
  priceKopecks: 18_900,
  stock: 'in' as const,
  sellerName: 'Опт-Юг',
};

describe('ProductDetailCard', () => {
  it('показывает название, цену за единицу и наличие', async () => {
    const screen = await render(
      <ProductDetailCard {...BASE} description="Розовые томаты грунтовые." />,
    );
    expect(screen.getByText('Помидоры розовые')).toBeTruthy();
    expect(screen.getByText(`189${NARROW_NBSP}₽`)).toBeTruthy();
    expect(screen.getByText('за 1 кг')).toBeTruthy();
    expect(screen.getByText('В наличии')).toBeTruthy();
    expect(screen.getByText('Розовые томаты грунтовые.')).toBeTruthy();
  });

  it('бейджи «Хит» и «Скоропорт» по флагам', async () => {
    const screen = await render(
      <ProductDetailCard {...BASE} isHit isPerishable />,
    );
    expect(screen.getByText('Хит')).toBeTruthy();
    expect(screen.getByText('Скоропорт')).toBeTruthy();
  });

  it('без флагов бейджей нет', async () => {
    const screen = await render(<ProductDetailCard {...BASE} />);
    expect(screen.queryByText('Хит')).toBeNull();
    expect(screen.queryByText('Скоропорт')).toBeNull();
  });

  it('минимальная партия с сокращённой единицей', async () => {
    const screen = await render(
      <ProductDetailCard {...BASE} minQuantity={5} />,
    );
    expect(screen.getByText('Минимальная партия — 5 × кг')).toBeTruthy();
  });

  it('продавец и список предложений', async () => {
    const screen = await render(
      <ProductDetailCard
        {...BASE}
        offers={[
          {
            id: 'o1',
            organizationName: 'Опт-Юг',
            priceKopecks: 18_900,
            stock: 53,
            minQuantity: 5,
          },
          {
            id: 'o2',
            organizationName: 'Сеть «У дома»',
            priceKopecks: 23_700,
            stock: 82,
            minQuantity: 1,
          },
        ]}
      />,
    );
    expect(screen.getAllByText('Опт-Юг').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Все предложения (2)')).toBeTruthy();
    expect(screen.getByText('Сеть «У дома»')).toBeTruthy();
    expect(screen.getByText('склад 53')).toBeTruthy();
  });

  it('одно предложение — блок списка не показывается', async () => {
    const screen = await render(
      <ProductDetailCard
        {...BASE}
        offers={[
          {
            id: 'o1',
            organizationName: 'Опт-Юг',
            priceKopecks: 18_900,
            stock: 53,
            minQuantity: 5,
          },
        ]}
      />,
    );
    expect(screen.queryByText(/Все предложения/)).toBeNull();
  });
});

describe('stockLevelFor', () => {
  it('0 → out, <20 → low, ≥20 → in', () => {
    expect(stockLevelFor(0)).toBe('out');
    expect(stockLevelFor(19)).toBe('low');
    expect(stockLevelFor(20)).toBe('in');
    expect(stockLevelFor(120)).toBe('in');
  });
});

describe('unitShort', () => {
  it('«1 кг» → «кг», «500 г» без изменений', () => {
    expect(unitShort('1 кг')).toBe('кг');
    expect(unitShort('500 г')).toBe('500 г');
  });
});
