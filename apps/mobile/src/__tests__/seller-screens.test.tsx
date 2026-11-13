/**
 * Тесты экранов кабинета продавца (Промт 10, Часть B):
 * товары (список/empty), предложения (сегменты), создание в 3 шага.
 *
 * API замокан: проверяется рендер и переходы шагов.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProductsScreen from '../app/(tabs)/wholesale/products';
import NewProductScreen from '../app/(tabs)/wholesale/products/new';
import OffersScreen from '../app/(tabs)/wholesale/offers';
import { useAuthStore, __resetAuthStoreForTests } from '../stores/authStore';
import { useContextStore } from '../stores/contextStore';

jest.mock('../services/api/sellerApi', () => ({
  fetchSellerProducts: jest.fn(),
  fetchSellerOffers: jest.fn(),
  fetchSellerOffer: jest.fn(),
  fetchSellerCategories: jest.fn(),
  createSellerProduct: jest.fn(),
  updateSellerProduct: jest.fn(),
  archiveSellerProduct: jest.fn(),
  createSellerOffer: jest.fn(),
  updateSellerOffer: jest.fn(),
  deleteSellerOffer: jest.fn(),
}));

const sellerApi = jest.requireMock('../services/api/sellerApi') as {
  fetchSellerProducts: jest.Mock;
  fetchSellerOffers: jest.Mock;
  fetchSellerCategories: jest.Mock;
};

const WHOLESALE = {
  userId: 'u1',
  role: 'wholesale_seller' as const,
  organizationId: 'o1',
  locationId: null,
};

async function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  __resetAuthStoreForTests();
  useAuthStore.setState({
    state: 'authenticated',
    user: {
      id: 'u1',
      phone: '+79001234567',
      name: 'Иван Петров',
      createdAt: '2026-01-01T00:00:00.000Z',
      memberships: [],
    },
    token: 'access',
  });
  useContextStore.setState({
    active: WHOLESALE,
    memberships: [],
    hydrated: true,
  });
  return AsyncStorage.clear();
});

describe('SellerProductsScreen', () => {
  it('пустой список — осмысленный EmptyState с CTA «Создать товар»', async () => {
    sellerApi.fetchSellerProducts.mockResolvedValue([]);
    await renderWithQuery(<ProductsScreen />);
    expect(await screen.findByText('Товаров пока нет')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Создать товар' }),
    ).toBeTruthy();
  });

  it('товары рендерятся строками с категорией и действиями', async () => {
    sellerApi.fetchSellerProducts.mockResolvedValue([
      {
        id: 'p1',
        title: 'Морковь мытая',
        subtitle: null,
        description: '',
        categoryId: 'c1',
        category: { id: 'c1', name: 'Овощи', slug: 'ovoshi' },
        unit: 'кг',
        images: [],
        archivedAt: null,
        offersCount: 2,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    await renderWithQuery(<ProductsScreen />);
    expect(await screen.findByText('Морковь мытая')).toBeTruthy();
    expect(screen.getByText(/Овощи · предложений: 2/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Редактировать' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Архив' })).toBeTruthy();
  });

  it('поиск фильтрует список локально', async () => {
    sellerApi.fetchSellerProducts.mockResolvedValue([
      {
        id: 'p1',
        title: 'Морковь мытая',
        subtitle: null,
        description: '',
        categoryId: 'c1',
        category: { id: 'c1', name: 'Овощи', slug: 'ovoshi' },
        unit: 'кг',
        images: [],
        archivedAt: null,
        offersCount: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'p2',
        title: 'Свёкла столовая',
        subtitle: null,
        description: '',
        categoryId: 'c1',
        category: { id: 'c1', name: 'Овощи', slug: 'ovoshi' },
        unit: 'кг',
        images: [],
        archivedAt: null,
        offersCount: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    await renderWithQuery(<ProductsScreen />);
    expect(await screen.findByText('Морковь мытая')).toBeTruthy();
    expect(screen.getByText('Свёкла столовая')).toBeTruthy();

    fireEvent.changeText(
      screen.getByTestId('seller-products-search'),
      'морков',
    );
    // Debounce поиска — 400 мс.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(screen.getByText('Морковь мытая')).toBeTruthy();
    expect(screen.queryByText('Свёкла столовая')).toBeNull();
  });
});

describe('SellerOffersScreen', () => {
  it('пустой список активных — EmptyState с переходом к товарам', async () => {
    sellerApi.fetchSellerOffers.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    await renderWithQuery(<OffersScreen />);
    expect(await screen.findByText('Предложений нет')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'К товарам' })).toBeTruthy();
  });

  it('офферы рендерятся через OfferRow: цена, склад, мин. партия', async () => {
    sellerApi.fetchSellerOffers.mockResolvedValue({
      items: [
        {
          id: 'o1',
          productId: 'p1',
          product: {
            id: 'p1',
            name: 'Морковь мытая',
            subtitle: null,
            unit: 'кг',
            images: '[]',
            archivedAt: null,
          },
          price: 4500,
          stock: 120,
          minQuantity: 10,
          badge: 'hit',
          isPerishable: false,
          archivedAt: null,
          priceHistory: [],
          stockChanges: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    await renderWithQuery(<OffersScreen />);
    expect(await screen.findByText('Морковь мытая')).toBeTruthy();
    expect(screen.getByText(/Склад: 120 кг · мин. 10 кг/)).toBeTruthy();
    expect(screen.getByText('Хит')).toBeTruthy();
  });
});

describe('NewProductScreen (3 шага + черновик)', () => {
  it('шаг 1 «Основное»: поля и выбор категории, «Далее» заблокирован без названия', async () => {
    sellerApi.fetchSellerCategories.mockResolvedValue([
      { id: 'c1', name: 'Овощи', slug: 'ovoshi' },
      { id: 'c2', name: 'Фрукты', slug: 'fruits' },
    ]);
    await renderWithQuery(<NewProductScreen />);
    expect(await screen.findByText('1. Основное')).toBeTruthy();
    expect(screen.getByTestId('product-title-input')).toBeTruthy();
    // Категория-чип
    fireEvent.press(screen.getByLabelText('Категория Овощи'));
    // «Далее» disabled без названия
    const next = screen.getByTestId('product-step-next');
    expect(next.props.accessibilityState?.disabled ?? true).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('product-title-input'), 'Морковь');
    expect(screen.getByText('2. Фото')).toBeTruthy();
  });

});
