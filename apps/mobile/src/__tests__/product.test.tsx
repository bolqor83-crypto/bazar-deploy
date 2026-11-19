/**
 * Тесты экрана товара (Промт 8, Часть C): галерея, карточка,
 * минимальная партия, сумма в кнопке, тост о будущей корзине.
 * Промт 14a: карусель похожих товаров — рендер, пустое состояние,
 * skeleton, переход на похожий товар.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type {
  CatalogProductDetail,
  CatalogSimilarProducts,
} from '@bazar/types';
import { ToastProvider } from '@bazar/ui';
import { fetchProduct, fetchSimilarProducts } from '../services/api/catalogApi';
import ProductScreen from '../app/(tabs)/customer/product/[id]';

import { addCartItem } from '../services/api/cartApi';

jest.mock('../services/api/catalogApi');
jest.mock('../services/api/cartApi', () => ({
  addCartItem: jest.fn(),
  fetchCart: jest.fn(),
  updateCartItem: jest.fn(),
  removeCartItem: jest.fn(),
  clearCart: jest.fn(),
}));

const mockRouterPush = jest.fn();

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return {
    ...actual,
    useLocalSearchParams: jest.fn(() => ({ id: 'p1' })),
    useRouter: () => ({
      push: mockRouterPush,
      back: jest.fn(),
      replace: jest.fn(),
    }),
  };
});

const fetchProductMock = jest.mocked(fetchProduct);
const fetchSimilarProductsMock = jest.mocked(fetchSimilarProducts);
const addCartItemMock = jest.mocked(addCartItem);

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
      priceOnRequest: false,
      stock: 53,
      minQuantity: 5,
      badge: 'hit',
      isPerishable: true,
      organization: { id: 'org1', name: 'Опт-Юг' },
    },
    {
      id: 'o2',
      priceKopecks: 23_700,
      priceOnRequest: false,
      stock: 82,
      minQuantity: 1,
      badge: null,
      isPerishable: true,
      organization: { id: 'org2', name: 'Сеть «У дома»' },
    },
  ],
};

const SIMILAR: CatalogSimilarProducts = {
  items: [
    {
      id: 'p2',
      name: 'Огурцы гладкие',
      unit: '1 кг',
      description: 'Гладкие огурцы.',
      category: { slug: 'vegetables', name: 'Овощи' },
      images: ['/api/media/seed/products/cucumbers.png'],
      bestOffer: {
        id: 'o3',
        priceKopecks: 10_400,
        priceOnRequest: false,
        stock: 120,
        minQuantity: 1,
        badge: null,
        isPerishable: false,
        organization: { id: 'org1', name: 'Опт-Юг' },
      },
      offersCount: 1,
    },
    {
      id: 'p3',
      name: 'Бананы',
      unit: '1 кг',
      description: 'Бананы первый сорт.',
      category: { slug: 'fruits', name: 'Фрукты' },
      images: ['/api/media/seed/products/bananas.png'],
      bestOffer: {
        id: 'o4',
        priceKopecks: 8_900,
        priceOnRequest: false,
        stock: 35,
        minQuantity: 3,
        badge: null,
        isPerishable: true,
        organization: { id: 'org1', name: 'Опт-Юг' },
      },
      offersCount: 1,
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
  fetchSimilarProductsMock.mockResolvedValue(SIMILAR);
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

  it('нажатие «В корзину» добавляет позицию и показывает тост', async () => {
    addCartItemMock.mockResolvedValue({ items: [], subtotal: 0, warnings: [] });
    const screen = await renderWithQuery(<ProductScreen />);
    await waitFor(() => {
      expect(screen.getByText('В корзину · 945 ₽')).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId('add-to-cart'));
    await waitFor(() => {
      // 189 ₽ × 5 (минимальная партия) = 945 ₽ — количество в запросе.
      expect(addCartItemMock).toHaveBeenCalledWith('o1', 5, undefined);
    });
    await waitFor(() => {
      expect(screen.getByText(/— в корзине/)).toBeTruthy();
    });
  });

  it('ошибка загрузки — ErrorState с повтором', async () => {
    fetchProductMock.mockRejectedValue(new Error('network'));
    const screen = await renderWithQuery(<ProductScreen />);
    await waitFor(() => {
      expect(screen.getByText('Товар не загрузился')).toBeTruthy();
    });
  });

  describe('карусель похожих товаров (Промт 14a)', () => {
    it('рендерит карусель с похожими при наличии данных', async () => {
      const screen = await renderWithQuery(<ProductScreen />);
      await waitFor(() => {
        expect(screen.getByText('Похожие товары')).toBeTruthy();
      });
      expect(screen.getByText('Огурцы гладкие')).toBeTruthy();
      expect(screen.getByText('Бананы')).toBeTruthy();
    });

    it('не рендерит секцию при пустом списке', async () => {
      fetchSimilarProductsMock.mockResolvedValue({ items: [] });
      const screen = await renderWithQuery(<ProductScreen />);
      await waitFor(() => {
        expect(screen.getByText('Помидоры розовые')).toBeTruthy();
      });
      expect(screen.queryByText('Похожие товары')).toBeNull();
    });

    it('при загрузке — skeleton-карточки карусели', async () => {
      // Управляемый pending: резолвим в конце, чтобы не оставить
      // висящие подписки (jest не выйдет, пока промис открыт).
      let resolveSimilar: (value: CatalogSimilarProducts) => void = () => {};
      fetchSimilarProductsMock.mockImplementation(
        () =>
          new Promise<CatalogSimilarProducts>((resolve) => {
            resolveSimilar = resolve;
          }),
      );
      const screen = await renderWithQuery(<ProductScreen />);
      await waitFor(() => {
        expect(screen.getByText('Похожие товары')).toBeTruthy();
      });
      expect(screen.getAllByTestId('carousel-skeleton')).toHaveLength(3);
      resolveSimilar(SIMILAR);
    });

    it('тап по карточке ведёт на другой товар', async () => {
      const screen = await renderWithQuery(<ProductScreen />);
      await waitFor(() => {
        expect(screen.getByText('Бананы')).toBeTruthy();
      });
      await fireEvent.press(screen.getByTestId('carousel-item-p3'));
      expect(mockRouterPush).toHaveBeenCalledWith('/customer/product/p3');
    });

    it('«Все» ведёт в каталог с категорией товара', async () => {
      const screen = await renderWithQuery(<ProductScreen />);
      await waitFor(() => {
        expect(screen.getByText('Все')).toBeTruthy();
      });
      await fireEvent.press(screen.getByTestId('carousel-see-all'));
      expect(mockRouterPush).toHaveBeenCalledWith(
        '/customer/catalog?category=vegetables',
      );
    });

    it('товары без цены не попадают в карусель', async () => {
      const withEmpty: CatalogSimilarProducts = {
        items: [
          ...SIMILAR.items,
          {
            id: 'p4',
            name: 'Яблоки без офферов',
            unit: '1 кг',
            description: '',
            category: { slug: 'fruits', name: 'Фрукты' },
            images: [],
            bestOffer: null,
            offersCount: 0,
          },
        ],
      };
      fetchSimilarProductsMock.mockResolvedValue(withEmpty);
      const screen = await renderWithQuery(<ProductScreen />);
      await waitFor(() => {
        expect(screen.getByText('Бананы')).toBeTruthy();
      });
      expect(screen.queryByText('Яблоки без офферов')).toBeNull();
    });

    it('ошибка загрузки похожих — секция скрыта, экран товара работает', async () => {
      fetchSimilarProductsMock.mockRejectedValue(new Error('network'));
      const screen = await renderWithQuery(<ProductScreen />);
      await waitFor(() => {
        expect(screen.getByText('Помидоры розовые')).toBeTruthy();
      });
      await waitFor(() => {
        expect(screen.queryByText('Похожие товары')).toBeNull();
      });
    });
  });
});
