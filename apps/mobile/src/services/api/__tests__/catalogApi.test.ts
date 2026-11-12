/**
 * Тесты catalogApi: URL-строка запроса, контракт ответа.
 * Мок apiRequest — проверяем параметры, а не сеть.
 */
import * as client from '../client';
import { fetchCategories, fetchProduct, fetchProducts } from '../catalogApi';

jest.mock('../client', () => ({
  apiRequest: jest.fn(),
}));

const apiRequestMock = jest.mocked(client.apiRequest);

describe('catalogApi', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it('fetchCategories: GET /catalog/categories без авторизации', async () => {
    apiRequestMock.mockResolvedValue([
      {
        id: 'c1',
        slug: 'vegetables',
        name: 'Овощи',
        icon: 'Carrot',
        productCount: 11,
      },
    ]);
    const result = await fetchCategories();
    expect(apiRequestMock).toHaveBeenCalledWith('/catalog/categories', {
      auth: false,
    });
    expect(result[0]?.slug).toBe('vegetables');
  });

  it('fetchProducts: параметры собираются в query-строку', async () => {
    apiRequestMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      hasMore: false,
    });
    await fetchProducts({
      category: 'vegetables',
      q: 'помидоры',
      sort: 'price-asc',
      page: 2,
      pageSize: 10,
      minPrice: 100,
      maxPrice: 300,
    });
    const [path] = apiRequestMock.mock.calls[0] ?? [];
    expect(path).toContain('/catalog/products?');
    expect(path).toContain('category=vegetables');
    expect(path).toContain(`q=${encodeURIComponent('помидоры')}`);
    expect(path).toContain('sort=price-asc');
    expect(path).toContain('page=2');
    expect(path).toContain('minPrice=100');
    expect(path).toContain('maxPrice=300');
  });

  it('fetchProducts: без фильтров — без вопросительного знака', async () => {
    apiRequestMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      hasMore: false,
    });
    await fetchProducts({});
    expect(apiRequestMock.mock.calls[0]?.[0]).toBe('/catalog/products');
  });

  it('fetchProduct: id подставляется в путь', async () => {
    apiRequestMock.mockResolvedValue({
      id: 'p1',
      name: 'Помидоры розовые',
      unit: '1 кг',
      description: '',
      category: { slug: 'vegetables', name: 'Овощи' },
      images: [],
      offers: [],
    });
    const product = await fetchProduct('p1');
    expect(apiRequestMock).toHaveBeenCalledWith('/catalog/products/p1', {
      auth: false,
    });
    expect(product.name).toBe('Помидоры розовые');
  });
});
