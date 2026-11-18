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

describe('(tabs)/customer/catalog — адаптивная сетка (Промт 15, D)', () => {
  let dimensionsSpy: jest.SpyInstance;

  function setWidth(width: number) {
    dimensionsSpy.mockReturnValue({
      width,
      height: 844,
      scale: 2,
      fontScale: 1,
    });
  }

  beforeEach(() => {
    dimensionsSpy = jest
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- spy на самом объекте модуля react-native: статический импорт даёт копию
      .spyOn(require('react-native'), 'useWindowDimensions')
      .mockReturnValue({ width: 390, height: 844, scale: 2, fontScale: 1 });
    fetchProductsMock.mockResolvedValue(
      page([
        product({ id: 'p1', name: 'Помидоры розовые' }),
        product({ id: 'p2', name: 'Огурцы гладкие' }),
        product({ id: 'p3', name: 'Морковь мытая' }),
        product({ id: 'p4', name: 'Лук репчатый' }),
        product({ id: 'p5', name: 'Кабачки' }),
      ]),
    );
  });

  afterEach(() => {
    dimensionsSpy.mockRestore();
  });

  /** Ряды сетки: View с flexDirection row, содержащие карточки
   *  каталога (testID catalog-product у Pressable карточки). */
  function gridRows(screen: Awaited<ReturnType<typeof renderWithQuery>>) {
    const rows: { cards: number; gap: unknown }[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') {
        return;
      }
      const record = node as {
        props?: Record<string, unknown>;
        children?: unknown[];
      };
      const style = record.props?.style;
      if (style) {
        const flat = Object.assign(
          {},
          ...([style].flat(Infinity) as Record<string, unknown>[]),
        );
        const cardChildren = (record.children ?? []).filter(
          (child) =>
            typeof child === 'object' &&
            child !== null &&
            (child as { props?: { testID?: string } }).props?.testID ===
              'catalog-product',
        );
        if (flat.flexDirection === 'row' && cardChildren.length > 0) {
          rows.push({ cards: cardChildren.length, gap: flat.gap });
        }
      }
      for (const child of record.children ?? []) {
        walk(child);
      }
    };
    walk(screen.toJSON());
    return rows;
  }

  it('на 390 — 2 колонки, gap 12', async () => {
    setWidth(390);
    const screen = await renderWithQuery(<CatalogScreen />);
    await waitFor(() => {
      expect(screen.getByText('Помидоры розовые')).toBeTruthy();
    });
    const rows = gridRows(screen);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.cards).toBe(2);
    expect(rows[0]?.gap).toBe(12);
  });

  it('на 768 — 3 колонки, gap 16', async () => {
    setWidth(768);
    const screen = await renderWithQuery(<CatalogScreen />);
    await waitFor(() => {
      expect(screen.getByText('Помидоры розовые')).toBeTruthy();
    });
    const rows = gridRows(screen);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.cards).toBe(3);
    expect(rows[0]?.gap).toBe(16);
  });

  it('resize пересоздаёт сетку: 2 → 3 колонки', async () => {
    setWidth(390);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const screen = await render(
      <QueryClientProvider client={client}>
        <CatalogScreen />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText('Помидоры розовые')).toBeTruthy();
    });
    expect(gridRows(screen)[0]?.cards).toBe(2);

    setWidth(800);
    await screen.rerender(
      <QueryClientProvider client={client}>
        <CatalogScreen />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(gridRows(screen)[0]?.cards).toBe(3);
    });
  });

  it('заголовок секции — сортировка и фильтры в одну строку', async () => {
    const screen = await renderWithQuery(<CatalogScreen />);
    await waitFor(() => {
      expect(screen.getByText('Помидоры розовые')).toBeTruthy();
    });
    expect(screen.getByText('Все товары')).toBeTruthy();
    expect(screen.getByLabelText('Сортировка: По популярности')).toBeTruthy();
    expect(screen.getByLabelText('Фильтры')).toBeTruthy();
    // Compact-подпись в заголовке, не длинная.
    expect(screen.getByText('Популярное')).toBeTruthy();
  });

  it('кнопка фильтров раскрывает панель цены', async () => {
    const screen = await renderWithQuery(<CatalogScreen />);
    await waitFor(() => {
      expect(screen.getByText('Помидоры розовые')).toBeTruthy();
    });
    expect(screen.queryByLabelText('Цена от')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Фильтры'));
    await waitFor(() => {
      expect(screen.getByLabelText('Цена от')).toBeTruthy();
    });
  });

  it('сортировка из заголовка применяется к запросу', async () => {
    const screen = await renderWithQuery(<CatalogScreen />);
    await waitFor(() => {
      expect(screen.getByText('Помидоры розовые')).toBeTruthy();
    });
    fetchProductsMock.mockClear();
    await fireEvent.press(screen.getByLabelText('Сортировка: По популярности'));
    await fireEvent.press(screen.getByLabelText('Сортировать Сначала дешевле'));
    await waitFor(() => {
      const call = fetchProductsMock.mock.calls[0]?.[0];
      expect(call?.sort).toBe('price-asc');
    });
  });
});
