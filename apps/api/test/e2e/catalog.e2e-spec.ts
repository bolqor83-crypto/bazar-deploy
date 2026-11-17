/**
 * E2E каталога (Промт 8, Часть C): публичные маршруты без Bearer,
 * фильтры/сортировка/пагинация, деталь товара, 404.
 */
import request from 'supertest';
import {
  clearDatabase,
  createTestApp,
  seedOfferStock,
  type TestApp,
} from './test-app';

describe('Каталог (e2e)', () => {
  let testApp: TestApp;
  let tomatoesId: string;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  beforeEach(async () => {
    await clearDatabase(testApp.prisma);

    const vegetables = await testApp.prisma.category.create({
      data: { slug: 'vegetables', name: 'Овощи', icon: 'Carrot', sortOrder: 1 },
    });
    const org = await testApp.prisma.organization.create({
      data: { name: 'Опт-Юг', type: 'WHOLESALE' },
    });

    const tomatoes = await testApp.prisma.product.create({
      data: {
        categoryId: vegetables.id,
        name: 'Помидоры розовые',
        unit: '1 кг',
        description: 'Розовые томаты грунтовые.',
        images: '["https://picsum.photos/seed/a/800/600"]',
      },
    });
    tomatoesId = tomatoes.id;

    const cucumbers = await testApp.prisma.product.create({
      data: {
        categoryId: vegetables.id,
        name: 'Огурцы гладкие',
        unit: '1 кг',
        description: 'Гладкие огурцы.',
        images: '[]',
      },
    });

    // Промт 14a: бананы — другая категория с оффером (добор similar).
    const fruits = await testApp.prisma.category.create({
      data: { slug: 'fruits', name: 'Фрукты', icon: 'Apple', sortOrder: 2 },
    });
    const bananas = await testApp.prisma.product.create({
      data: {
        categoryId: fruits.id,
        name: 'Бананы',
        unit: '1 кг',
        description: 'Бананы первый сорт.',
        images: '[]',
      },
    });
    const offerBananas = await testApp.prisma.productOffer.create({
      data: {
        productId: bananas.id,
        organizationId: org.id,
        priceKopecks: 8900,
        minQuantity: 3,
        badge: null,
        isPerishable: true,
      },
    });

    const offerTomatoes = await testApp.prisma.productOffer.create({
      data: {
        productId: tomatoes.id,
        organizationId: org.id,
        priceKopecks: 18900,
        minQuantity: 5,
        badge: 'hit',
        isPerishable: true,
      },
    });
    const offerCucumbers = await testApp.prisma.productOffer.create({
      data: {
        productId: cucumbers.id,
        organizationId: org.id,
        priceKopecks: 10400,
        minQuantity: 1,
        badge: null,
        isPerishable: false,
      },
    });
    // Промт 11: остатки — INITIAL-движения + балансы.
    await seedOfferStock(testApp.prisma, {
      offerId: offerTomatoes.id,
      organizationId: org.id,
      qty: 50,
    });
    await seedOfferStock(testApp.prisma, {
      offerId: offerCucumbers.id,
      organizationId: org.id,
      qty: 120,
    });
    await seedOfferStock(testApp.prisma, {
      offerId: offerBananas.id,
      organizationId: org.id,
      qty: 35,
    });
  });

  it('категории доступны без авторизации', async () => {
    const res = await request(testApp.server).get('/api/catalog/categories');
    expect(res.status).toBe(200);
    // Промт 14a: в фикстуре 2 категории (овощи + фрукты для similar).
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      slug: 'vegetables',
      name: 'Овощи',
      productCount: 2,
    });
  });

  it('список товаров: bestOffer и счётчик предложений', async () => {
    const res = await request(testApp.server).get('/api/catalog/products');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    const tomatoes = res.body.items.find(
      (p: { name: string }) => p.name === 'Помидоры розовые',
    );
    expect(tomatoes.bestOffer).toMatchObject({
      priceKopecks: 18900,
      organization: { name: 'Опт-Юг' },
    });
    expect(tomatoes.offersCount).toBe(1);
  });

  it('поиск и фильтр цены работают вместе', async () => {
    const res = await request(testApp.server)
      .get('/api/catalog/products')
      .query({ q: 'огурцы', minPrice: 100, maxPrice: 110, sort: 'price-asc' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].name).toBe('Огурцы гладкие');
  });

  it('пагинация: pageSize=1 → три страницы, hasMore на первой', async () => {
    const page1 = await request(testApp.server)
      .get('/api/catalog/products')
      .query({ pageSize: 1, page: 1 });
    expect(page1.body.items).toHaveLength(1);
    expect(page1.body.hasMore).toBe(true);

    const page3 = await request(testApp.server)
      .get('/api/catalog/products')
      .query({ pageSize: 1, page: 3 });
    expect(page3.body.items).toHaveLength(1);
    expect(page3.body.hasMore).toBe(false);
  });

  it('некорректная сортировка — 400 VALIDATION_ERROR', async () => {
    const res = await request(testApp.server)
      .get('/api/catalog/products')
      .query({ sort: 'wrong' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('деталь товара с предложениями', async () => {
    const res = await request(testApp.server).get(
      `/api/catalog/products/${tomatoesId}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Помидоры розовые');
    expect(res.body.category).toEqual({ slug: 'vegetables', name: 'Овощи' });
    expect(res.body.offers[0].organization.name).toBe('Опт-Юг');
  });

  it('предложения товара отдельным маршрутом', async () => {
    const res = await request(testApp.server).get(
      `/api/catalog/products/${tomatoesId}/offers`,
    );
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].priceKopecks).toBe(18900);
  });

  it('несуществующий товар — 404 PRODUCT_NOT_FOUND', async () => {
    const res = await request(testApp.server).get('/api/catalog/products/nope');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('limit — алиас pageSize (Промт 9): ограничивает выдачу', async () => {
    const res = await request(testApp.server)
      .get('/api/catalog/products')
      .query({ limit: 5 });
    expect(res.status).toBe(200);
    // В фикстуре 2 товара — limit=5 отдаёт их все, но pageSize
    // отражает запрошенный limit (алиас пробрасывается в пагинацию).
    expect(res.body.pageSize).toBe(5);
    expect(res.body.items.length).toBeLessThanOrEqual(5);

    const one = await request(testApp.server)
      .get('/api/catalog/products')
      .query({ limit: 1 });
    expect(one.status).toBe(200);
    expect(one.body.items).toHaveLength(1);
    expect(one.body.pageSize).toBe(1);
    expect(one.body.hasMore).toBe(true);
  });

  describe('excludeId (Промт 14a)', () => {
    it('исключает товар из списка', async () => {
      const res = await request(testApp.server)
        .get('/api/catalog/products')
        .query({ excludeId: tomatoesId });
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items.map((p: { id: string }) => p.id)).not.toContain(
        tomatoesId,
      );
    });

    it('невалидный excludeId игнорируется', async () => {
      const res = await request(testApp.server)
        .get('/api/catalog/products')
        .query({ excludeId: 'совсем-не-id' });
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3);
    });
  });

  describe('похожие товары (Промт 14a)', () => {
    it('200: только чужие id, та же категория первым', async () => {
      const res = await request(testApp.server).get(
        `/api/catalog/products/similar/${tomatoesId}`,
      );
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      for (const item of res.body.items) {
        expect(item.id).not.toBe(tomatoesId);
        expect(item).toHaveProperty('bestOffer');
        expect(item).toHaveProperty('offersCount');
      }
      // Помидоры — овощи: огурцы (овощи) раньше бананов (фрукты).
      expect(res.body.items[0].name).toBe('Огурцы гладкие');
    });

    it('limit ограничивает выдачу', async () => {
      const res = await request(testApp.server)
        .get(`/api/catalog/products/similar/${tomatoesId}`)
        .query({ limit: 1 });
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].category.slug).toBe('vegetables');
    });

    it('limit вне границ — 400 VALIDATION_ERROR', async () => {
      const res = await request(testApp.server)
        .get(`/api/catalog/products/similar/${tomatoesId}`)
        .query({ limit: 25 });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('порядок стабилен между вызовами (детерминированный рандом)', async () => {
      const first = await request(testApp.server).get(
        `/api/catalog/products/similar/${tomatoesId}`,
      );
      const second = await request(testApp.server).get(
        `/api/catalog/products/similar/${tomatoesId}`,
      );
      expect(first.body.items.map((p: { id: string }) => p.id)).toEqual(
        second.body.items.map((p: { id: string }) => p.id),
      );
    });

    it('несуществующий товар — 404', async () => {
      const res = await request(testApp.server).get(
        '/api/catalog/products/similar/nope',
      );
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('PRODUCT_NOT_FOUND');
    });
  });
});
