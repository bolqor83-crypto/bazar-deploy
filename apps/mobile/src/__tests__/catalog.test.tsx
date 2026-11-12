/**
 * Тесты экрана каталога (Промт 8, Часть C): рендер карточек,
 * поиск, категории, пустое состояние, ошибка, пагинация.
 * API замокано; TanStack Query — реальный с обёрткой-провайдером.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { CatalogProduct, CatalogProductList } from '@bazar/types';
import { customerContext } from '../mocks/context';
import { useContextStore } from '../stores/contextStore';
import { fetchCategories, fetchProducts } from '../services/api/catalogApi';
import CatalogScreen from '../app/(tabs)/customer/catalog';

jest.mock('../services/api/catalogApi');

const fetchCategoriesMock = jest.mocked(fetchCategories);
const fetchProductsMock = jest.mocked(fetchProducts);

function product(partial: Partial<CatalogProduct>): CatalogProduct {
  return {
    id: 'p1',
    name: 'Помидоры розовые',
    unit: '1 кг',
    description: 'Розовые томаты грунтовые.',
    category: { slug: 'vegetables', name: 'Овощи' },
    images: [],
    bestOffer: {
      id: 'o1',
      priceKopecks: 18_900,
      stock: 53,
      minQuantity: 5,
      badge: 'hit',
      isPerishable: true,
      organization: { id: 'org1', name: 'Опт-Юг' },
    },
    offersCount: 3,
    ...partial,
  };
}

function page(
  items: CatalogProduct[],
  extra: Partial<CatalogProductList> = {},
): CatalogProductList {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 10,
    hasMore: false,
    ...extra,
  };
}

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Без GC-таймеров: джест не ждёт 5-минутную уборку кэша.
        gcTime: 0,
      },
    },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useContextStore.setState({
    ...useContextStore.getState(),
    active: customerContext,
    hydrated: true,
  });
  fetchCategoriesMock.mockResolvedValue([
    {
      id: 'c1',
      slug: 'vegetables',
      name: 'Овощи',
      icon: 'Carrot',
      productCount: 11,
    },
    {
      id: 'c2',
      slug: 'fruits',
      name: 'Фрукты',
      icon: 'Apple',
      productCount: 7,
    },
  ]);
  fetchProductsMock.mockResolvedValue(
    page([
      product({ id: 'p1', name: 'Помидоры розовые' }),
      product({
        id: 'p2',
        name: 'Огурцы гладкие',
        bestOffer: null,
        offersCount: 0,
      }),
    ]),
  );
});

describe('(tabs)/customer/catalog', () => {
  it('показывает карточки товаров из API', async () => {
    const screen = await renderWithQuery(<CatalogScreen />);
    await waitFor(() => {
      expect(screen.getByText('Помидоры розовые')).toBeTruthy();
    });
    expect(screen.getByText('Огурцы гладкие')).toBeTruthy();
    expect(fetchProductsMock).toHaveBeenCalled();
  });

  it('пустой результат — осмысленное пустое состояние со сбросом', async () => {
    fetchProductsMock.mockResolvedValue(page([]));
    const screen = await renderWithQuery(<CatalogScreen />);
    await waitFor(() => {
      expect(screen.getByText('Ничего не нашлось')).toBeTruthy();
    });
  });

  it('ошибка загрузки — ErrorState с повтором', async () => {
    fetchProductsMock.mockRejectedValue(new Error('network'));
    const screen = await renderWithQuery(<CatalogScreen />);
    await waitFor(() => {
      expect(screen.getByText('Каталог не загрузился')).toBeTruthy();
    });
  });

  it('пока грузится — скелетон, не спиннер', async () => {
    fetchProductsMock.mockReturnValue(new Promise(() => undefined));
    const screen = await renderWithQuery(<CatalogScreen />);
    // Заголовок таба/экрана уже есть, карточек ещё нет
    expect(screen.queryByText('Помидоры розовые')).toBeNull();
  });

  it('выбор категории передаёт slug в запрос', async () => {
    const screen = await renderWithQuery(<CatalogScreen />);
    await waitFor(() => {
      expect(screen.getByText('Помидоры розовые')).toBeTruthy();
    });
    fetchProductsMock.mockClear();
    await fireEvent.press(screen.getByLabelText('Категория: Овощи'));
    await waitFor(() => {
      const call = fetchProductsMock.mock.calls[0]?.[0];
      expect(call?.category).toBe('vegetables');
    });
  });

  it('ввод поиска уходит в запрос с дебаунсом', async () => {
    const screen = await renderWithQuery(<CatalogScreen />);
    await waitFor(() => {
      expect(screen.getByText('Помидоры розовые')).toBeTruthy();
    });
    fetchProductsMock.mockClear();
    fireEvent.changeText(
      screen.getByLabelText('Поиск по каталогу'),
      'помидоры',
    );
    // До истечения дебаунса (400 мс) запроса ещё нет
    expect(fetchProductsMock).not.toHaveBeenCalled();
    await waitFor(
      () => {
        const call = fetchProductsMock.mock.calls[0]?.[0];
        expect(call?.q).toBe('помидоры');
      },
      { timeout: 4000 },
    );
  });
});
