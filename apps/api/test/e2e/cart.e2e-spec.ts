/**
 * E2E корзины (Промт 9, Часть D): позиции, границы количества,
 * изоляция пользователей, очистка.
 */
import request from 'supertest';
import {
  clearDatabase,
  createTestApp,
  registerUser,
  type TestApp,
} from './test-app';

describe('Корзина (e2e)', () => {
  let testApp: TestApp;
  let token = '';
  let offerId = '';
  let offerMinQuantity = 1;
  let offerStock = 1;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  beforeEach(async () => {
    await clearDatabase(testApp.prisma);

    const registered = await registerUser(testApp.server, '+79001112233');
    token = registered.accessToken;

    const category = await testApp.prisma.category.create({
      data: { slug: 'vegetables', name: 'Овощи', icon: 'Carrot', sortOrder: 1 },
    });
    const org = await testApp.prisma.organization.create({
      data: { name: 'Опт-Юг', type: 'WHOLESALE' },
    });
    const product = await testApp.prisma.product.create({
      data: {
        categoryId: category.id,
        name: 'Помидоры розовые',
        unit: '1 кг',
        description: 'Розовые томаты.',
        images: '[]',
      },
    });
    const offer = await testApp.prisma.productOffer.create({
      data: {
        productId: product.id,
        organizationId: org.id,
        priceKopecks: 18900,
        stock: 50,
        minQuantity: 5,
      },
    });
    offerId = offer.id;
    offerMinQuantity = offer.minQuantity;
    offerStock = offer.stock;
  });

  // Заголовок собирается в момент теста: token появляется в beforeEach.
  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('пустая корзина нового пользователя', async () => {
    const res = await request(testApp.server).get('/api/cart').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.subtotal).toBe(0);
  });

  it('добавление позиции: подсчёт итога', async () => {
    const res = await request(testApp.server)
      .post('/api/cart/items')
      .set(auth())
      .send({ offerId, quantity: 10 });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(10);
    expect(res.body.items[0].subtotal).toBe(189000);
    expect(res.body.subtotal).toBe(189000);
    expect(res.body.items[0].offer.product.name).toBe('Помидоры розовые');
  });

  it('повторное добавление того же оффера инкрементирует количество', async () => {
    await request(testApp.server)
      .post('/api/cart/items')
      .set(auth())
      .send({ offerId, quantity: 10 });
    const res = await request(testApp.server)
      .post('/api/cart/items')
      .set(auth())
      .send({ offerId, quantity: 5 });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(15);
  });

  it(`ниже минимальной партии (${offerMinQuantity}) — 400 BELOW_MIN_QUANTITY`, async () => {
    const res = await request(testApp.server)
      .post('/api/cart/items')
      .set(auth())
      .send({ offerId, quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BELOW_MIN_QUANTITY');
  });

  it(`выше склада (${offerStock}) — 400 STOCK_EXCEEDED`, async () => {
    const res = await request(testApp.server)
      .post('/api/cart/items')
      .set(auth())
      .send({ offerId, quantity: offerStock + 1 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('STOCK_EXCEEDED');
  });

  it('изменение количества PATCH', async () => {
    const added = await request(testApp.server)
      .post('/api/cart/items')
      .set(auth())
      .send({ offerId, quantity: 10 });
    const itemId = added.body.items[0].id;
    const res = await request(testApp.server)
      .patch(`/api/cart/items/${itemId}`)
      .set(auth())
      .send({ quantity: 20 });
    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(20);
    expect(res.body.subtotal).toBe(378000);
  });

  it('удаление позиции и очистка корзины', async () => {
    const added = await request(testApp.server)
      .post('/api/cart/items')
      .set(auth())
      .send({ offerId, quantity: 10 });
    const itemId = added.body.items[0].id;

    const removed = await request(testApp.server)
      .delete(`/api/cart/items/${itemId}`)
      .set(auth());
    expect(removed.status).toBe(200);
    expect(removed.body.items).toHaveLength(0);

    await request(testApp.server)
      .post('/api/cart/items')
      .set(auth())
      .send({ offerId, quantity: 10 });
    const cleared = await request(testApp.server)
      .delete('/api/cart')
      .set(auth());
    expect(cleared.status).toBe(200);
    expect(cleared.body.items).toHaveLength(0);
  });

  it('изоляция: Борис не видит корзину Алисы', async () => {
    await request(testApp.server)
      .post('/api/cart/items')
      .set(auth())
      .send({ offerId, quantity: 10 });
    const boris = await registerUser(testApp.server, '+79005556677', 'Борис');
    const res = await request(testApp.server)
      .get('/api/cart')
      .set({ Authorization: `Bearer ${boris.accessToken}` });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  it('warning при уменьшении склада ниже количества в корзине', async () => {
    await request(testApp.server)
      .post('/api/cart/items')
      .set(auth())
      .send({ offerId, quantity: 10 });
    await testApp.prisma.productOffer.update({
      where: { id: offerId },
      data: { stock: 3 },
    });
    const res = await request(testApp.server).get('/api/cart').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.warnings).toHaveLength(1);
    expect(res.body.warnings[0].message).toContain('3');
  });

  it('без JWT — 401', async () => {
    const res = await request(testApp.server).get('/api/cart');
    expect(res.status).toBe(401);
  });
});
