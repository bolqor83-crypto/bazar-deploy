/**
 * E2E аналитики рынка — AI Layer 0 (Промт 18, Часть C).
 *
 * trends/volumes — публичные агрегаты; users/anomalies — только
 * продавцам (SellerMembershipGuard). Объёмы считаются по заказам
 * (отменённые исключены), тренды — по активным офферам.
 */
import request from 'supertest';
import {
  clearDatabase,
  createTestApp,
  registerUser,
  seedOfferStock,
  type TestApp,
} from './test-app';

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('Аналитика рынка (e2e)', () => {
  let testApp: TestApp;
  let buyerToken = '';
  let sellerToken = '';
  let sellerOrgId = '';
  let categoryId = '';
  let offerId = '';

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  beforeEach(async () => {
    await clearDatabase(testApp.prisma);

    const buyer = await registerUser(testApp.server, '+79001113300', 'Иван');
    buyerToken = buyer.accessToken;
    const seller = await registerUser(testApp.server, '+79001113301', 'Опт-Юг');
    sellerToken = seller.accessToken;
    const org = await testApp.prisma.organization.create({
      data: {
        name: 'Опт-Юг аналитика',
        type: 'WHOLESALE',
        memberships: {
          create: { userId: seller.userId, role: 'WHOLESALE_SELLER' },
        },
      },
    });
    sellerOrgId = org.id;

    const category = await testApp.prisma.category.create({
      data: { slug: 'veg-a', name: 'Овощи А', icon: 'Apple', sortOrder: 1 },
    });
    categoryId = category.id;
    const product = await testApp.prisma.product.create({
      data: {
        categoryId,
        name: 'Помидоры',
        unit: '1 кг',
        description: 'Описание.',
        images: '[]',
      },
    });
    const offer = await testApp.prisma.productOffer.create({
      data: {
        productId: product.id,
        organizationId: org.id,
        priceKopecks: 10_000,
        minQuantity: 1,
      },
    });
    offerId = offer.id;
    await seedOfferStock(testApp.prisma, {
      offerId: offer.id,
      organizationId: org.id,
      qty: 100,
    });
  });

  it('trends: публично, отдаёт категорию со средней ценой', async () => {
    const res = await request(testApp.server)
      .get('/api/market/trends')
      .query({ period: 'week' });
    expect(res.status).toBe(200);
    expect(res.body.period).toBe('week');
    const item = res.body.items.find(
      (i: { categoryId: string }) => i.categoryId === categoryId,
    );
    expect(item).toMatchObject({
      categoryName: 'Овощи А',
      avgPriceKopecks: 10_000,
      offers: 1,
    });
    // Истории цен нет — изменение неизвестно, не выдумываем.
    expect(item.changePercent).toBeNull();
  });

  it('trends: фильтр по категории и невалидный период', async () => {
    const filtered = await request(testApp.server)
      .get('/api/market/trends')
      .query({ category: categoryId });
    expect(filtered.status).toBe(200);
    expect(filtered.body.items).toHaveLength(1);

    const unknown = await request(testApp.server)
      .get('/api/market/trends')
      .query({ category: 'no-such-category' });
    expect(unknown.status).toBe(200);
    expect(unknown.body.items).toHaveLength(0);

    const bad = await request(testApp.server)
      .get('/api/market/trends')
      .query({ period: 'year' });
    expect(bad.status).toBe(400);
  });

  it('volumes: публично, учитывает заказы и исключает отменённые', async () => {
    // Подтверждённый заказ: 5 × помидоры.
    const created = await request(testApp.server)
      .post('/api/orders')
      .set(auth(buyerToken))
      .send({
        items: [{ offerId, quantity: 5 }],
        deliveryMethod: 'pickup',
      });
    expect(created.status).toBe(200);
    await request(testApp.server)
      .post(`/api/seller/orders/${created.body[0].id}/confirm`)
      .set(auth(sellerToken))
      .set('X-Organization-Id', sellerOrgId);

    // Отменённый заказ: 3 × помидоры — в объёмы не попадает.
    const cancelled = await request(testApp.server)
      .post('/api/orders')
      .set(auth(buyerToken))
      .send({
        items: [{ offerId, quantity: 3 }],
        deliveryMethod: 'pickup',
      });
    expect(cancelled.status).toBe(200);
    await request(testApp.server)
      .post(`/api/orders/${cancelled.body[0].id}/cancel`)
      .set(auth(buyerToken));

    const res = await request(testApp.server)
      .get('/api/market/volumes')
      .query({ period: 'week' });
    expect(res.status).toBe(200);
    const item = res.body.items.find((i: { productId: string }) => i.productId);
    expect(item).toMatchObject({ productName: 'Помидоры', quantity: 5 });
    expect(item.ordersCount).toBe(1);
  });

  it('users: без токена 401, продавцу — активность по ролям', async () => {
    const anon = await request(testApp.server).get('/api/market/users');
    expect(anon.status).toBe(401);

    // Заказ делает уже сессия: покупатель активен.
    const created = await request(testApp.server)
      .post('/api/orders')
      .set(auth(buyerToken))
      .send({
        items: [{ offerId, quantity: 2 }],
        deliveryMethod: 'pickup',
      });
    expect(created.status).toBe(200);

    const res = await request(testApp.server)
      .get('/api/market/users')
      .set(auth(sellerToken))
      .set('X-Organization-Id', sellerOrgId)
      .query({ period: 'week' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('anomalies: без токена 401, продавцу — 200 со списком', async () => {
    const anon = await request(testApp.server).get('/api/market/anomalies');
    expect(anon.status).toBe(401);

    const res = await request(testApp.server)
      .get('/api/market/anomalies')
      .set(auth(sellerToken))
      .set('X-Organization-Id', sellerOrgId)
      .query({ period: 'week' });
    expect(res.status).toBe(200);
    expect(res.body.period).toBe('week');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('users без организации в заголовке — guard требует контекст (400)', async () => {
    const res = await request(testApp.server)
      .get('/api/market/users')
      .set(auth(buyerToken));
    expect(res.status).toBe(400);
  });
});
