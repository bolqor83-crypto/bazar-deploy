/**
 * Тест восстановления черновика нового товара (Промт 10, Часть B).
 *
 * Отдельный файл: интерактивные тесты соседних экранов оставляют
 * незавершённые act()-области (overlapping act), которые ломают
 * рендер последующего теста — черновик проверяется изолированно.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NewProductScreen from '../app/(tabs)/wholesale/products/new';
import { useAuthStore, __resetAuthStoreForTests } from '../stores/authStore';
import { useContextStore } from '../stores/contextStore';

jest.mock('../services/api/sellerApi', () => ({
  fetchSellerCategories: jest.fn(),
  fetchSellerProducts: jest.fn(),
  fetchSellerOffers: jest.fn(),
  fetchSellerOffer: jest.fn(),
  createSellerProduct: jest.fn(),
  updateSellerProduct: jest.fn(),
  archiveSellerProduct: jest.fn(),
  createSellerOffer: jest.fn(),
  updateSellerOffer: jest.fn(),
  deleteSellerOffer: jest.fn(),
}));

const sellerApi = jest.requireMock('../services/api/sellerApi');

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

describe('NewProductScreen: черновик', () => {
  it('черновик восстанавливается из AsyncStorage', async () => {
    await AsyncStorage.setItem(
      'bazar.seller.product.draft.u1',
      JSON.stringify({
        basic: { title: 'Черновик', subtitle: '', categoryId: 'c1', unit: 'кг', description: '' },
        imageUrls: [],
        price: '45',
        stock: '100',
        minQuantity: '10',
        step: 0,
      }),
    );
    sellerApi.fetchSellerCategories.mockResolvedValue([
      { id: 'c1', name: 'Овощи', slug: 'ovoshi' },
    ]);
    await renderWithQuery(<NewProductScreen />);
    const titleInput = await screen.findByLabelText('Название', {}, {
      timeout: 4000,
    });
    await waitFor(() => expect(titleInput.props.value).toBe('Черновик'), {
      timeout: 4000,
    });
    expect(screen.getByLabelText('Единица измерения').props.value).toBe(
      'кг',
    );
  });
});
