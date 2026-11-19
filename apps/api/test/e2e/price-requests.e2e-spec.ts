/**
 * E2E запросов цены «по запросу» (Промт 16, Часть C).
 *
 * Полный цикл: покупатель запрашивает цену на POR-оффер →
 * продавец отвечает персональной ценой (72 часа) → покупатель
 * кладёт в корзину по quote → заказ со снапшотом quotedPrice и
 * трассировкой priceRequestId. Изоляция покупателей, скрытие
 * базовой цены из публичного каталога, отклонение, идемпотентность
 * PENDING, редактирование недоступно.
 */
import request from 'supertest';
import {
  clearDatabase,
  createTestApp,
  registerUser,
  seedOfferStock,
  type TestApp,
} from './test-app';

describe('Запросы цены (e2e)', () => {
  let testApp: TestApp;
  let buyerToken = '';
  let otherBuyerToken = '';
  let orgId = '';
  let productId = '';
  let porOfferId = '';
  let openOfferId = '';

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  beforeEach(async () => {
    await clearDatabase(testApp.prisma);

    const buyer = await registerUser(testApp.server, '+79001112233', 'Иван');
    buyerToken = buyer.accessToken;
    const otherBuyer = await registerUser(
      testApp.server,
      '+79001112299',
      'Пётр',
    );
    otherBuyerToken = otherBuyer.accessToken;

    const seller = await registerUser(
      testApp.server,
      '+79001110001',
      'Продавец',
    );
    const sellerToken = seller.accessToken;

    const org = await testApp.prisma.organization.create({
      data: {
        name: 'Опт-Юг',
        type: 'WHOLESALE',
        memberships: {
          create: { userId: seller.userId, role: 'WHOLESALE_SELLER' },
        },
      },
    });
    orgId = org.id;

    const category = await testApp.prisma.category.create({
      data: { slug: 'ovoshi', name: 'Овощи', icon: 'Carrot', sortOrder: 1 },
    });

    const product = await testApp.prisma.product.create({
      data: {
        categoryId: category.id,
        name: 'Картофель продовольственный',
        unit: '1 кг',
        description: 'Картофель первого сорта.',
        images: '[]',
      },
    });
    productId = product.id;

    // POR-оффер: цена скрыта от покупателей.
    const porOffer = await testApp.prisma.productOffer.create({
      data: {
        productId,
        organizationId: orgId,
        priceKopecks: 25000,
        priceOnRequest: true,
        minQuantity: 10,
      },
    });
    porOfferId = porOffer.id;
    await seedOfferStock(testApp.prisma, {
      offerId: porOfferId,
      organizationId: orgId,
      qty: 100,
    });

    // Обычный оффер того же продавца (для негативных кейсов).
    const otherProduct = await testApp.prisma.product.create({
      data: {
        categoryId: category.id,
        name: 'Помидоры розовые',
        unit: '1 кг',
        description: 'Розовые томаты.',
        images: '[]',
      },
    });
    const openOffer = await testApp.prisma.productOffer.create({
      data: {
        productId: otherProduct.id,
        organizationId: orgId,
        priceKopecks: 18900,
        minQuantity: 5,
      },
    });
    openOfferId = openOffer.id;
    await seedOfferStock(testApp.prisma, {
      offerId: openOfferId,
      organizationId: orgId,
      qty: 50,
    });

    // sellerAuth строится в момент теста (токен свежий).
    sellerAuthToken = sellerToken;
  });

  /** Токен продавца из последнего beforeEach. */
  let sellerAuthToken = '';

  const buyerAuth = () => ({ Authorization: `Bearer ${buyerToken}` });
  const otherAuth = () => ({ Authorization: `Bearer ${otherBuyerToken}` });
  const sellerAuth = () => ({
    Authorization: `Bearer ${sellerAuthToken}`,
    'X-Organization-Id': orgId,
  });

  it('каталог скрывает базовую цену POR-оффера', async () => {
    const detail = await request(testApp.server).get(
      `/api/catalog/products/${productId}`,
    );
    expect(detail.status).toBe(200);
    expect(detail.body.offers).toHaveLength(1);
    expect(detail.body.offers[0].priceKopecks).toBeNull();
    expect(detail.body.offers[0].priceOnRequest).toBe(true);
  });

  it('полный цикл: запрос → ответ → корзина по quote → заказ', async () => {
    // 1. Запрос цены.
    const created = await request(testApp.server)
      .post('/api/price-requests')
      .set(buyerAuth())
      .send({ offerId: porOfferId, quantity: 20, message: 'До пятницы' });
    expect(created.status).toBe(200);
    expect(created.body.status).toBe('PENDING');
    expect(created.body.offer.priceKopecks).toBeNull();
    const requestId = created.body.id as string;

    // 2. Продавец отвечает ценой.
    const responded = await request(testApp.server)
      .post(`/api/price-requests/${requestId}/respond`)
      .set(sellerAuth())
      .send({ price: 22000 });
    expect(responded.status).toBe(200);
    expect(responded.body.status).toBe('ANSWERED');
    expect(responded.body.quotedPriceKopecks).toBe(22000);
    expect(responded.body.validUntil).toBeTruthy();
    expect(responded.body.expired).toBe(false);

    // 3. Корзина по персональной цене.
    const cart = await request(testApp.server)
      .post('/api/cart/items')
      .set(buyerAuth())
      .send({
        offerId: porOfferId,
        quantity: 20,
        priceRequestId: requestId,
      });
    expect(cart.status).toBe(200);
    expect(cart.body.items).toHaveLength(1);
    expect(cart.body.items[0].quote.priceKopecks).toBe(22000);
    expect(cart.body.items[0].subtotal).toBe(22000 * 20);
    expect(cart.body.subtotal).toBe(22000 * 20);

    // 4. Заказ: снапшот цены + трассировка.
    const order = await request(testApp.server)
      .post('/api/orders')
      .set(buyerAuth())
      .send({
        items: [{ offerId: porOfferId, quantity: 20 }],
        deliveryMethod: 'pickup',
      });
    expect(order.status).toBe(200);
    expect(order.body).toHaveLength(1);
    expect(order.body[0].items[0].price).toBe(22000);
    expect(order.body[0].items[0].priceRequestId).toBe(requestId);
    expect(order.body[0].subtotal).toBe(22000 * 20);
  });

  it('идемпотентность: повторный запрос возвращает тот же PENDING', async () => {
    const first = await request(testApp.server)
      .post('/api/price-requests')
      .set(buyerAuth())
      .send({ offerId: porOfferId, quantity: 20 });
    expect(first.status).toBe(200);
    const second = await request(testApp.server)
      .post('/api/price-requests')
      .set(buyerAuth())
      .send({ offerId: porOfferId, quantity: 30 });
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
  });

  it('запрос на открытую цену — 400', async () => {
    const response = await request(testApp.server)
      .post('/api/price-requests')
      .set(buyerAuth())
      .send({ offerId: openOfferId, quantity: 10 });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('PRICE_REQUEST_NOT_ALLOWED');
  });

  it('изоляция: чужой запрос — 404, чужой quote в корзину не годится', async () => {
    const created = await request(testApp.server)
      .post('/api/price-requests')
      .set(otherAuth())
      .send({ offerId: porOfferId, quantity: 20 });
    expect(created.status).toBe(200);
    const requestId = created.body.id as string;

    // Покупатель-чужой не видит запрос.
    const detail = await request(testApp.server)
      .get(`/api/price-requests/${requestId}`)
      .set(buyerAuth());
    expect(detail.status).toBe(404);

    // И не может добавить по чужому quote.
    const cart = await request(testApp.server)
      .post('/api/cart/items')
      .set(buyerAuth())
      .send({
        offerId: porOfferId,
        quantity: 20,
        priceRequestId: requestId,
      });
    expect(cart.status).toBe(404);
    expect(cart.body.code).toBe('PRICE_REQUEST_NOT_FOUND');
  });

  it('POR-оффер в корзину без quote — 400 PRICE_REQUIRED', async () => {
    const cart = await request(testApp.server)
      .post('/api/cart/items')
      .set(buyerAuth())
      .send({ offerId: porOfferId, quantity: 20 });
    expect(cart.status).toBe(400);
    expect(cart.body.code).toBe('PRICE_REQUIRED');
  });

  it('отклонение: покупатель видит DECLINED, новый запрос возможен', async () => {
    const created = await request(testApp.server)
      .post('/api/price-requests')
      .set(buyerAuth())
      .send({ offerId: porOfferId, quantity: 20 });
    const requestId = created.body.id as string;

    const declined = await request(testApp.server)
      .post(`/api/price-requests/${requestId}/decline`)
      .set(sellerAuth())
      .send({ reason: 'Нет объёма' });
    expect(declined.status).toBe(200);
    expect(declined.body.status).toBe('DECLINED');

    // Новый запрос возможен (живого PENDING на пару больше нет).
    const again = await request(testApp.server)
      .post('/api/price-requests')
      .set(buyerAuth())
      .send({ offerId: porOfferId, quantity: 20 });
    expect(again.status).toBe(200);
    expect(again.body.id).not.toBe(requestId);
  });

  it('редактирование ответа недоступно — 400', async () => {
    const created = await request(testApp.server)
      .post('/api/price-requests')
      .set(buyerAuth())
      .send({ offerId: porOfferId, quantity: 20 });
    const requestId = created.body.id as string;
    await request(testApp.server)
      .post(`/api/price-requests/${requestId}/respond`)
      .set(sellerAuth())
      .send({ price: 22000 });
    const again = await request(testApp.server)
      .post(`/api/price-requests/${requestId}/respond`)
      .set(sellerAuth())
      .send({ price: 21000 });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('PRICE_REQUEST_ALREADY_ANSWERED');
  });

  it('входящие запросы продавца: список с покупателем и базовой ценой', async () => {
    await request(testApp.server)
      .post('/api/price-requests')
      .set(buyerAuth())
      .send({ offerId: porOfferId, quantity: 20 });

    const incoming = await request(testApp.server)
      .get('/api/price-requests/incoming')
      .set(sellerAuth());
    expect(incoming.status).toBe(200);
    expect(incoming.body.items).toHaveLength(1);
    expect(incoming.body.items[0].buyer.name).toBe('Иван');
    expect(incoming.body.items[0].offer.priceKopecks).toBe(25000);
  });

  it('уведомления: создан → продавцу, ответ → покупателю', async () => {
    const created = await request(testApp.server)
      .post('/api/price-requests')
      .set(buyerAuth())
      .send({ offerId: porOfferId, quantity: 20 });
    const requestId = created.body.id as string;

    const sellerNotifications = await request(testApp.server)
      .get('/api/notifications')
      .set(sellerAuth());
    expect(sellerNotifications.status).toBe(200);
    expect(
      sellerNotifications.body.items.find(
        (n: { type: string }) => n.type === 'PRICE_REQUEST_CREATED',
      ),
    ).toBeTruthy();

    await request(testApp.server)
      .post(`/api/price-requests/${requestId}/respond`)
      .set(sellerAuth())
      .send({ price: 22000 });

    const buyerNotifications = await request(testApp.server)
      .get('/api/notifications')
      .set(buyerAuth());
    expect(
      buyerNotifications.body.items.find(
        (n: { type: string }) => n.type === 'PRICE_REQUEST_ANSWERED',
      ),
    ).toBeTruthy();
  });

  it('мои запросы покупателя — только свои, без buyer-поля', async () => {
    await request(testApp.server)
      .post('/api/price-requests')
      .set(buyerAuth())
      .send({ offerId: porOfferId, quantity: 20 });
    await request(testApp.server)
      .post('/api/price-requests')
      .set(otherAuth())
      .send({ offerId: porOfferId, quantity: 30 });

    const mine = await request(testApp.server)
      .get('/api/price-requests')
      .set(buyerAuth());
    expect(mine.status).toBe(200);
    expect(mine.body.items).toHaveLength(1);
    expect(mine.body.items[0].buyer).toBeUndefined();
  });
});
