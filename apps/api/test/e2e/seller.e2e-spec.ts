/**
 * E2E кабинет продавца: /api/seller/products и /api/seller/offers
 * (Промт 10, Часть B).
 *
 * Сценарии: guard (без org / без membership), CRUD товаров с
 * soft-delete, офферы с историей цены и журналом склада, скрытие
 * stock=0 из каталога, удаление с заказами → архив.
 */
import request from 'supertest';
import {
  clearDatabase,
  createTestApp,
  registerUser,
  type TestApp,
} from './test-app';

describe('Seller products & offers (e2e)', () => {
  let testApp: TestApp;
  let sellerToken: string;
  let strangerToken: string;
  let orgId: string;
  let categoryId: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    await clearDatabase(testApp.prisma);

    const seller = await registerUser(testApp.server, '+79001110001', 'Продавец');
    sellerToken = seller.accessToken;
    const stranger = await registerUser(
      testApp.server,
      '+79001110002',
      'Чужой',
    );
    strangerToken = stranger.accessToken;

    // Организация + членство WHOLESALE_SELLER напрямую в БД.
    const org = await testApp.prisma.organization.create({
      data: {
        name: 'Опт-Юг',
        type: 'WHOLESALE',
        memberships: {
          create: {
            userId: seller.userId,
            role: 'WHOLESALE_SELLER',
          },
        },
      },
    });
    orgId = org.id;

    const category = await testApp.prisma.category.create({
      data: { slug: 'ovoshi', name: 'Овощи', icon: 'Carrot', sortOrder: 1 },
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await testApp.close();
  });

  let productId: string;

  it('без X-Organization-Id — 400 SELLER_NO_ORGANIZATION', async () => {
    const response = await request(testApp.server)
      .get('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('SELLER_NO_ORGANIZATION');
  });

  it('без членства WHOLESALE_SELLER — 403 SELLER_FORBIDDEN', async () => {
    const response = await request(testApp.server)
      .get('/api/seller/products')
      .set('Authorization', `Bearer ${strangerToken}`)
      .set('X-Organization-Id', orgId);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('SELLER_FORBIDDEN');
  });

  it('создание товара: title/subtitle/unit + категория', async () => {
    const response = await request(testApp.server)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId)
      .send({
        title: 'Морковь мытая',
        subtitle: 'Новый урожай',
        description: 'Сладкая морковь',
        categoryId,
        unit: 'кг',
      });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: 'Морковь мытая',
      subtitle: 'Новый урожай',
      unit: 'кг',
      archivedAt: null,
    });
    productId = response.body.id;
  });

  it('несуществующая категория — 404', async () => {
    const response = await request(testApp.server)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId)
      .send({ title: 'Тест', categoryId: 'nope', unit: 'кг' });
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('обновление товара', async () => {
    const response = await request(testApp.server)
      .patch(`/api/seller/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId)
      .send({ subtitle: 'Партия 1 сорт' });
    expect(response.status).toBe(200);
    expect(response.body.subtitle).toBe('Партия 1 сорт');
  });

  it('товар виден в списке организации', async () => {
    const response = await request(testApp.server)
      .get('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Морковь мытая');
  });

  let offerId: string;

  it('создание оффера: price/stock/minQuantity + история', async () => {
    const response = await request(testApp.server)
      .post('/api/seller/offers')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId)
      .send({ productId, price: 4500, stock: 100, minQuantity: 10 });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      price: 4500,
      stock: 100,
      minQuantity: 10,
    });
    expect(response.body.priceHistory).toHaveLength(1);
    expect(response.body.stockChanges).toHaveLength(1);
    offerId = response.body.id;
  });

  it('валидация: price=0 и stock<0 — 400', async () => {
    const badPrice = await request(testApp.server)
      .post('/api/seller/offers')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId)
      .send({ productId, price: 0, stock: 10 });
    expect(badPrice.status).toBe(400);

    const badStock = await request(testApp.server)
      .post('/api/seller/offers')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId)
      .send({ productId, price: 100, stock: -1 });
    expect(badStock.status).toBe(400);
  });

  it('смена цены и склада пишут историю', async () => {
    const response = await request(testApp.server)
      .patch(`/api/seller/offers/${offerId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId)
      .send({ price: 4900, stock: 80, stockReason: 'инвентаризация' });
    expect(response.status).toBe(200);
    expect(response.body.priceHistory).toHaveLength(2);
    expect(response.body.priceHistory[0].price).toBe(4900);
    expect(response.body.stockChanges[0]).toMatchObject({
      previousStock: 100,
      newStock: 80,
      reason: 'инвентаризация',
    });
  });

  it('оффер виден в каталоге товара', async () => {
    const detail = await request(testApp.server)
      .get(`/api/catalog/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.offers).toHaveLength(1);
    expect(detail.body.offers[0].priceKopecks).toBe(4900);
  });

  it('stock=0 скрывает оффер из каталога', async () => {
    await request(testApp.server)
      .patch(`/api/seller/offers/${offerId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId)
      .send({ stock: 0, stockReason: 'распродано' });

    const detail = await request(testApp.server)
      .get(`/api/catalog/products/${productId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.offers).toHaveLength(0);

    // Восстановим склад для следующих тестов.
    await request(testApp.server)
      .patch(`/api/seller/offers/${offerId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId)
      .send({ stock: 50, stockReason: 'поставка' });
  });

  it('оффер с заказами при DELETE — архив, не удаление', async () => {
    // Покупатель + заказ на оффер.
    const buyer = await registerUser(testApp.server, '+79001110003', 'Покупатель');
    await request(testApp.server)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .send({ offerId, quantity: 10 });
    const order = await request(testApp.server)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .send({
        deliveryMethod: 'pickup',
        items: [{ offerId, quantity: 10 }],
      });
    expect(order.status).toBe(200);
    expect(order.body).toHaveLength(1);

    const response = await request(testApp.server)
      .delete(`/api/seller/offers/${offerId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ archived: true });

    const stillExists = await testApp.prisma.productOffer.findUnique({
      where: { id: offerId },
    });
    expect(stillExists?.archivedAt).not.toBeNull();
  });

  it('поиск и сегменты offers: active пуст, archived содержит', async () => {
    const active = await request(testApp.server)
      .get('/api/seller/offers')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId);
    expect(active.status).toBe(200);
    expect(active.body.items).toHaveLength(0);

    const archived = await request(testApp.server)
      .get('/api/seller/offers?archived=true')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId);
    expect(archived.body.items).toHaveLength(1);
    expect(archived.body.items[0].product.name).toBe('Морковь мытая');

    const search = await request(testApp.server)
      .get('/api/seller/offers?archived=true&search=морков')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId);
    expect(search.body.items).toHaveLength(1);
    const noMatch = await request(testApp.server)
      .get('/api/seller/offers?archived=true&search=свёкла')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId);
    expect(noMatch.body.items).toHaveLength(0);
  });

  it('архив товара: уходит из каталога, виден в archived-списке', async () => {
    const response = await request(testApp.server)
      .delete(`/api/seller/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId);
    expect(response.status).toBe(200);
    expect(response.body.archivedAt).not.toBeNull();

    const detail = await request(testApp.server)
      .get(`/api/catalog/products/${productId}`);
    expect(detail.status).toBe(404);

    const archivedList = await request(testApp.server)
      .get('/api/seller/products?archived=true')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId);
    expect(archivedList.body).toHaveLength(1);

    const activeList = await request(testApp.server)
      .get('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('X-Organization-Id', orgId);
    expect(activeList.body).toHaveLength(0);
  });
});
