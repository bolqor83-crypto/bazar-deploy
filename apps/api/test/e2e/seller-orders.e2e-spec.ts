/**
 * E2E жизненный цикл заказа продавца + уведомления (Промт 10,
 * Часть C): /api/seller/orders и /api/notifications.
 *
 * Сценарии: guard, список с фильтрами/поиском, детали с покупателем,
 * полный цикл confirm→preparing→ready→complete с уведомлениями
 * покупателю, некорректные переходы, отмена (stock назад,
 * уведомления обеим сторонам), отметки о прочтении.
 */
import request from 'supertest';
import {
  clearDatabase,
  createTestApp,
  offerAvailable,
  registerUser,
  seedOfferStock,
  type TestApp,
} from './test-app';

describe('Seller orders & notifications (e2e)', () => {
  let testApp: TestApp;
  let sellerToken: string;
  let seller2Token: string;
  let buyerToken: string;
  let strangerToken: string;
  let orgId: string;
  let offerId: string;
  let offer2Id: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    await clearDatabase(testApp.prisma);

    const seller = await registerUser(
      testApp.server,
      '+79002110001',
      'Продавец Юг',
    );
    sellerToken = seller.accessToken;
    const seller2 = await registerUser(
      testApp.server,
      '+79002110002',
      'Второй продавец',
    );
    seller2Token = seller2.accessToken;
    const buyer = await registerUser(testApp.server, '+79002110003', 'Мария');
    buyerToken = buyer.accessToken;
    const stranger = await registerUser(
      testApp.server,
      '+79002110004',
      'Чужой',
    );
    strangerToken = stranger.accessToken;

    // Организация: два продавца (оба получают уведомления).
    const org = await testApp.prisma.organization.create({
      data: {
        name: 'Опт-Юг',
        type: 'WHOLESALE',
        memberships: {
          create: [
            { userId: seller.userId, role: 'WHOLESALE_SELLER' },
            { userId: seller2.userId, role: 'WHOLESALE_SELLER' },
          ],
        },
      },
    });
    orgId = org.id;

    const category = await testApp.prisma.category.create({
      data: { slug: 'ovoshi', name: 'Овощи', icon: 'Carrot', sortOrder: 1 },
    });
    const product = await testApp.prisma.product.create({
      data: {
        name: 'Помидоры розовые',
        unit: 'кг',
        description: 'Астраханские',
        categoryId: category.id,
      },
    });
    const offer = await testApp.prisma.productOffer.create({
      data: {
        productId: product.id,
        organizationId: orgId,
        priceKopecks: 18900,
        minQuantity: 5,
      },
    });
    offerId = offer.id;
    const product2 = await testApp.prisma.product.create({
      data: {
        name: 'Огурцы гладкие',
        unit: 'кг',
        description: 'Гладкие',
        categoryId: category.id,
      },
    });
    const offer2 = await testApp.prisma.productOffer.create({
      data: {
        productId: product2.id,
        organizationId: orgId,
        priceKopecks: 10400,
        minQuantity: 1,
      },
    });
    offer2Id = offer2.id;
    // Промт 11: остатки — INITIAL-движения + балансы.
    await seedOfferStock(testApp.prisma, {
      offerId: offerId,
      organizationId: orgId,
      qty: 50,
    });
    await seedOfferStock(testApp.prisma, {
      offerId: offer2Id,
      organizationId: orgId,
      qty: 30,
    });
  });

  afterAll(async () => {
    await testApp.close();
  });

  /** Заголовки продавца. */
  const sellerHeaders = (token = sellerToken) => ({
    Authorization: `Bearer ${token}`,
    'X-Organization-Id': orgId,
  });

  /** Создать заказ покупателем → id первого заказа. */
  async function createBuyerOrder(offerIdToUse = offerId): Promise<string> {
    const response = await request(testApp.server)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        items: [{ offerId: offerIdToUse, quantity: 10 }],
        deliveryMethod: 'pickup',
      });
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    return response.body[0].id as string;
  }

  let orderId: string;

  it('guard: без организации — 400, без membership — 403', async () => {
    const noOrg = await request(testApp.server)
      .get('/api/seller/orders')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(noOrg.status).toBe(400);
    expect(noOrg.body.code).toBe('SELLER_NO_ORGANIZATION');

    const forbidden = await request(testApp.server)
      .get('/api/seller/orders')
      .set('Authorization', `Bearer ${strangerToken}`)
      .set('X-Organization-Id', orgId);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe('SELLER_FORBIDDEN');
  });

  it('покупатель оформил заказ — продавцам пришло NEW_ORDER', async () => {
    orderId = await createBuyerOrder();

    for (const token of [sellerToken, seller2Token]) {
      const response = await request(testApp.server)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.unread).toBe(1);
      expect(response.body.items[0].type).toBe('NEW_ORDER');
      expect(response.body.items[0].title).toContain('Новый заказ BZ-');
      expect(response.body.items[0].payload.orderId).toBe(orderId);
    }
  });

  it('список заказов продавца: заказ с карточкой покупателя', async () => {
    const response = await request(testApp.server)
      .get('/api/seller/orders')
      .set(sellerHeaders());
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    const order = response.body.items[0];
    expect(order.id).toBe(orderId);
    expect(order.status).toBe('PENDING');
    expect(order.buyer).toMatchObject({ name: 'Мария' });
    expect(order.buyer.phone).toBe('+79002110003');
    // Промт 15, E: группировка на клиенте — по buyer.id.
    expect(typeof order.buyer.id).toBe('string');
    expect(order.buyer.id.length).toBeGreaterThan(0);
    expect(order.items[0].title).toBe('Помидоры розовые');
  });

  it('детали заказа продавца', async () => {
    const response = await request(testApp.server)
      .get(`/api/seller/orders/${orderId}`)
      .set(sellerHeaders());
    expect(response.status).toBe(200);
    expect(response.body.number).toMatch(/^BZ-\d{4}-\d{6}$/);
    expect(response.body.events[0].type).toBe('CREATED');
  });

  it('неизвестное действие — 400 UNKNOWN_ACTION', async () => {
    const response = await request(testApp.server)
      .post(`/api/seller/orders/${orderId}/ship`)
      .set(sellerHeaders());
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('UNKNOWN_ACTION');
  });

  it('пропуск шага (PENDING→preparing) — 400 INVALID_TRANSITION', async () => {
    const response = await request(testApp.server)
      .post(`/api/seller/orders/${orderId}/preparing`)
      .set(sellerHeaders());
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_TRANSITION');
  });

  it('confirm: статус CONFIRMED, событие, уведомление покупателю, SALE_OUT + UNRESERVED', async () => {
    // До подтверждения: резерв висит (available 40, reserved 10,
    // physical 50).
    expect(await offerAvailable(testApp.prisma, offerId)).toBe(40);

    const response = await request(testApp.server)
      .post(`/api/seller/orders/${orderId}/confirm`)
      .set(sellerHeaders());
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('CONFIRMED');
    expect(response.body.events.map((e: { type: string }) => e.type)).toEqual(
      expect.arrayContaining(['CREATED', 'CONFIRMED']),
    );

    // Промт 11: SALE_OUT списал физический остаток (50 → 40),
    // UNRESERVED снял резерв (10 → 0), доступность не изменилась.
    const balance = await testApp.prisma.stockBalance.findFirstOrThrow({
      where: { offerId: offerId },
    });
    expect(balance.physicalQty).toBe(40);
    expect(balance.reservedQty).toBe(0);
    expect(balance.availableQty).toBe(40);
    const saleOutCount = await testApp.prisma.stockMovement.count({
      where: { offerId: offerId, type: 'SALE_OUT' },
    });
    expect(saleOutCount).toBe(1);
    const unreservedCount = await testApp.prisma.stockMovement.count({
      where: { offerId: offerId, type: 'UNRESERVED' },
    });
    expect(unreservedCount).toBe(1);

    const notifications = await request(testApp.server)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(notifications.body.total).toBe(1);
    expect(notifications.body.items[0].type).toBe('ORDER_STATUS');
    expect(notifications.body.items[0].title).toContain('подтверждён');
    expect(notifications.body.items[0].payload.status).toBe('CONFIRMED');
  });

  it('полный цикл до COMPLETED: preparing → ready → complete', async () => {
    const preparing = await request(testApp.server)
      .post(`/api/seller/orders/${orderId}/preparing`)
      .set(sellerHeaders());
    expect(preparing.status).toBe(200);
    expect(preparing.body.status).toBe('PREPARING');

    const ready = await request(testApp.server)
      .post(`/api/seller/orders/${orderId}/ready`)
      .set(sellerHeaders());
    expect(ready.status).toBe(200);
    expect(ready.body.status).toBe('READY');

    const complete = await request(testApp.server)
      .post(`/api/seller/orders/${orderId}/complete`)
      .set(sellerHeaders());
    expect(complete.status).toBe(200);
    expect(complete.body.status).toBe('COMPLETED');

    // 4 уведомления покупателю: confirm + preparing + ready + complete.
    const notifications = await request(testApp.server)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(notifications.body.total).toBe(4);
    expect(notifications.body.unread).toBe(4);

    // Завершённый заказ — в фильтре завершённых.
    const done = await request(testApp.server)
      .get('/api/seller/orders?status=COMPLETED')
      .set(sellerHeaders());
    expect(done.body.total).toBe(1);

    // complete из COMPLETED — уже нельзя.
    const again = await request(testApp.server)
      .post(`/api/seller/orders/${orderId}/complete`)
      .set(sellerHeaders());
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('INVALID_TRANSITION');
  });

  it('фильтр нескольких статусов и поиск по номеру', async () => {
    await createBuyerOrder(offer2Id);
    const response = await request(testApp.server)
      .get('/api/seller/orders?status=COMPLETED,PENDING')
      .set(sellerHeaders());
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);

    const numberResponse = await request(testApp.server)
      .get('/api/seller/orders?search=BZ-')
      .set(sellerHeaders());
    expect(numberResponse.body.total).toBe(2);

    const byBuyer = await request(testApp.server)
      .get('/api/seller/orders?search=Мария')
      .set(sellerHeaders());
    expect(byBuyer.body.total).toBe(2);

    const none = await request(testApp.server)
      .get('/api/seller/orders?search=нет-такого')
      .set(sellerHeaders());
    expect(none.body.total).toBe(0);
  });

  it('отмена продавцом: возврат резерва (UNRESERVED) + уведомление покупателю', async () => {
    // 30 - 10 зарезервировано заказом.
    expect(await offerAvailable(testApp.prisma, offer2Id)).toBe(20);

    // Найдём PENDING-заказ (второй, огурцы).
    const list = await request(testApp.server)
      .get('/api/seller/orders?status=PENDING')
      .set(sellerHeaders());
    const pendingId = list.body.items[0].id;

    const cancel = await request(testApp.server)
      .post(`/api/seller/orders/${pendingId}/cancel`)
      .set(sellerHeaders());
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('CANCELLED');

    // Промт 11: резерв снят — доступность восстановлена.
    expect(await offerAvailable(testApp.prisma, offer2Id)).toBe(30);
    const balance = await testApp.prisma.stockBalance.findFirstOrThrow({
      where: { offerId: offer2Id },
    });
    expect(balance.reservedQty).toBe(0);
    expect(balance.physicalQty).toBe(30);

    const notifications = await request(testApp.server)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${buyerToken}`);
    const cancelled = notifications.body.items.find(
      (n: { type: string }) => n.type === 'ORDER_CANCELLED',
    );
    expect(cancelled).toBeDefined();
    expect(cancelled.title).toContain('отменён продавцом');
  });

  it('отмена покупателем — уведомление продавцам', async () => {
    const orderId3 = await createBuyerOrder();
    const cancel = await request(testApp.server)
      .post(`/api/orders/${orderId3}/cancel`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('CANCELLED');

    const notifications = await request(testApp.server)
      .get('/api/notifications?unread=true')
      .set('Authorization', `Bearer ${sellerToken}`);
    const buyerCancelled = notifications.body.items.find(
      (n: { title: string }) => n.title.includes('отменён покупателем'),
    );
    expect(buyerCancelled).toBeDefined();
    expect(buyerCancelled.type).toBe('ORDER_CANCELLED');
  });

  it('unread-count и отметка о прочтении', async () => {
    const count = await request(testApp.server)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(count.status).toBe(200);
    const before = count.body.unread as number;
    expect(before).toBeGreaterThan(0);

    const list = await request(testApp.server)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${buyerToken}`);
    const first = list.body.items[0];

    const mark = await request(testApp.server)
      .post(`/api/notifications/${first.id}/read`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(mark.status).toBe(200);
    expect(mark.body.readAt).not.toBeNull();

    // Чужое уведомление — 404.
    const foreign = await request(testApp.server)
      .post(`/api/notifications/${first.id}/read`)
      .set('Authorization', `Bearer ${strangerToken}`);
    expect(foreign.status).toBe(404);

    const after = await request(testApp.server)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(after.body.unread).toBe(before - 1);
  });

  it('read-all: все прочитаны, повтор — 400', async () => {
    const response = await request(testApp.server)
      .post('/api/notifications/read-all')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(response.status).toBe(200);
    expect(response.body.updated).toBeGreaterThan(0);

    const count = await request(testApp.server)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(count.body.unread).toBe(0);

    const again = await request(testApp.server)
      .post('/api/notifications/read-all')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('NOTHING_TO_READ');
  });

  it('пагинация уведомлений: pageSize=1', async () => {
    const page1 = await request(testApp.server)
      .get('/api/notifications?pageSize=1')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(page1.status).toBe(200);
    expect(page1.body.items).toHaveLength(1);
    expect(page1.body.hasMore).toBe(true);
    expect(page1.body.unread).toBe(0);
  });
});
