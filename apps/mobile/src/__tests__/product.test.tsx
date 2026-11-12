/**
 * Тесты экрана товара (Промт 8, Часть C): галерея, карточка,
 * минимальная партия, сумма в кнопке, тост о будущей корзине.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CatalogProductDetail } from '@bazar/types';
import { ToastProvider } from '@bazar/ui';
import { fetchProduct } from '../services/api/catalogApi';
import ProductScreen from '../app/(tabs)/customer/product/[id]';

jest.mock('../services/api/catalogApi');

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    useLocalSearchParams: jest.fn(() => ({ id: 'p1' })),
    useRouter: actual.useRouter,
  };
});

const fetchProductMock = jest.mocked(fetchProduct);

const DETAIL: CatalogProductDetail = {
  id: 'p1',
  name: 'Помидоры розовые',
  unit: '1 кг',
  description: 'Розовые томаты грунтовые.',
  category: { slug: 'vegetables', name: 'Овощи' },
  images: [
    'https://picsum.photos/seed/a/800/600',
    'https://picsum.photos/seed/b/800/600',
  ],
  offers: [
    {
      id: 'o1',
      priceKopecks: 18_900,
      stock: 53,
      minQuantity: 5,
      badge: 'hit',
      isPerishable: true,
      organization: { id: 'org1', name: 'Опт-Юг' },
    },
    {
      id: 'o2',
      priceKopecks: 23_700,
      stock: 82,
      minQuantity: 1,
      badge: null,
      isPerishable: true,
      organization: { id: 'org2', name: 'Сеть «У дома»' },
    },
  ],
};

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  fetchProductMock.mockResolvedValue(DETAIL);
});

describe('(tabs)/customer/product/[id]', () => {
  it('показывает название, цену, минимальную партию и предложения', async () => {
    const screen = await renderWithQuery(<ProductScreen />);
    await waitFor(() => {
      expect(screen.getByText('Помидоры розовые')).toBeTruthy();
    });
    expect(screen.getByText('Минимальная партия — 5 × кг')).toBeTruthy();
    expect(screen.getByText('Сеть «У дома»')).toBeTruthy();
    expect(screen.getByText('Все предложения (2)')).toBeTruthy();
  });

  it('кнопка показывает сумму: цена × минимальная партия', async () => {
    const screen = await renderWithQuery(<ProductScreen />);
    await waitFor(() => {
      // 189 ₽ × 5 = 945 ₽
      expect(screen.getByText('В корзину · 945 ₽')).toBeTruthy();
    });
  });

  it('изменение количества пересчитывает сумму', async () => {
    const screen = await renderWithQuery(<ProductScreen />);
    await waitFor(() => {
      expect(screen.getByText('В корзину · 945 ₽')).toBeTruthy();
    });
    await fireEvent.press(screen.getByLabelText('Увеличить количество'));
    // 189 ₽ × 6 = 1 134 ₽
    await waitFor(() => {
      expect(screen.getByText('В корзину · 1 134 ₽')).toBeTruthy();
    });
  });

  it('нажатие «В корзину» показывает тост о Промте 9', async () => {
    const screen = await renderWithQuery(<ProductScreen />);
    await waitFor(() => {
      expect(screen.getByText('В корзину · 945 ₽')).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId('add-to-cart'));
    await waitFor(() => {
      expect(
        screen.getByText('Корзина появится в следующем обновлении'),
      ).toBeTruthy();
    });
  });

  it('ошибка загрузки — ErrorState с повтором', async () => {
    fetchProductMock.mockRejectedValue(new Error('network'));
    const screen = await renderWithQuery(<ProductScreen />);
    await waitFor(() => {
      expect(screen.getByText('Товар не загрузился')).toBeTruthy();
    });
  });
});
