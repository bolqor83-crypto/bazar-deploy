/**
 * E2E доставок (Промт 10, Часть D): /api/deliveries и
 * /api/carrier/deliveries.
 *
 * Сценарии: guard перевозчика, создание заявки (валидации статуса
 * заказа, дубликат, изоляция), лента feed/mine, атомарное принятие
 * (гонка двух организаций), полный цикл picked-up → in-transit →
 * delivered → complete покупателем, некорректные переходы, отмена
 * по правилам ролей, карточка доставки в заказе (buyer/seller),
 * уведомления участникам.
 */
import request from 'supertest';
import {
  clearDatabase,
  createTestApp,
  registerUser,
  seedOfferStock,
  type TestApp,
} from './test-app';

describe('Deliveries (e2e)', () => {
  let testApp: TestApp;
  let sellerToken: string;
  let buyerToken: string;
  let carrierToken: string;
  let carrier2Token: string;
  let otherCarrierToken: string;
  let strangerToken: string;
  let orgId: string;
  let carrierOrgId: string;
  let otherCarrierOrgId: string;
  let offerId: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    await clearDatabase(testApp.prisma);

    const seller = await registerUser(
      testApp.server,
      '+79002200001',
      'Продавец Юг',
    );
    sellerToken = seller.accessToken;
    const buyer = await registerUser(testApp.server, '+79002200002', 'Мария');
    buyerToken = buyer.accessToken;
    const carrier = await registerUser(
      testApp.server,
      '+79002200003',
      'Иван-перевозчик',
    );
    carrierToken = carrier.accessToken;
    const carrier2 = await registerUser(
      testApp.server,
      '+79002200004',
      'Второй перевозчик',
    );
    carrier2Token = carrier2.accessToken;
    const otherCarrier = await registerUser(
      testApp.server,
      '+79002200005',
      'Чужой перевозчик',
    );
    otherCarrierToken = otherCarrier.accessToken;
    const stranger = await registerUser(
      testApp.server,
      '+79002200006',
      'Чужой',
    );
    strangerToken = stranger.accessToken;

    const org = await testApp.prisma.organization.create({
      data: {
        name: 'Опт-Юг',
        type: 'WHOLESALE',
        memberships: {
          create: [{ userId: seller.userId, role: 'WHOLESALE_SELLER' }],
        },
      },
    });
    orgId = org.id;
    const carrierOrg = await testApp.prisma.organization.create({
      data: {
        name: 'Транс-Логистик',
        type: 'LOGISTICS',
        memberships: {
          create: [
            { userId: carrier.userId, role: 'CARRIER' },
            { userId: carrier2.userId, role: 'CARRIER' },
          ],
        },
      },
    });
    carrierOrgId = carrierOrg.id;
    const otherCarrierOrg = await testApp.prisma.organization.create({
      data: {
        name: 'Другая логистика',
        type: 'LOGISTICS',
        memberships: {
          create: [{ userId: otherCarrier.userId, role: 'CARRIER' }],
        },
      },
    });
    otherCarrierOrgId = otherCarrierOrg.id;

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
    // Промт 11: остаток — INITIAL-движение + баланс.
    await seedOfferStock(testApp.prisma, {
      offerId: offer.id,
      organizationId: orgId,
      qty: 50,
    });
    offerId = offer.id;
  });

  afterAll(async () => {
    await testApp.close();
  });

  /** Заголовки. */
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const carrierHeaders = (token = carrierToken, org = carrierOrgId) => ({
    Authorization: `Bearer ${token}`,
    'X-Organization-Id': org,
  });

  /** Заказ покупателя (pickup), подтверждён продавцом. */
  async function confirmedOrder(): Promise<string> {
    const created = await request(testApp.server)
      .post('/api/orders')
      .set(auth(buyerToken))
      .send({ items: [{ offerId, quantity: 5 }], deliveryMethod: 'pickup' });
    expect(created.status).toBe(200);
    const orderId = created.body[0].id as string;
    const confirmed = await request(testApp.server)
      .post(`/api/seller/orders/${orderId}/confirm`)
      .set(auth(sellerToken))
      .set('X-Organization-Id', orgId);
    expect(confirmed.status).toBe(200);
    return orderId;
  }

  /** Тело заявки на доставку. */
  const deliveryBody = (orderId: string) => ({
    orderId,
    pickupAddress: 'База Опт-Юг, ул. Шоссейная, 4',
    pickupContact: 'Пётр, +79005550101',
    dropoffAddress: 'ул. Большая Садовая, 101',
    dropoffContact: 'Мария, +79005550202',
    weightKg: 60,
    volumeL: 400,
    cargoNotes: 'Ящики, не кантовать',
  });

  let orderId: string;
  let deliveryId: string;

  it('guard перевозчика: без организации — 400, без membership — 403', async () => {
    const noOrg = await request(testApp.server)
      .get('/api/carrier/deliveries?scope=feed')
      .set(auth(carrierToken));
    expect(noOrg.status).toBe(400);
    expect(noOrg.body.code).toBe('CARRIER_NO_ORGANIZATION');

    const forbidden = await request(testApp.server)
      .get('/api/carrier/deliveries?scope=feed')
      .set(auth(strangerToken))
      .set('X-Organization-Id', carrierOrgId);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe('CARRIER_FORBIDDEN');
  });

  it('заявка по неподтверждённому заказу — 400 DELIVERY_ORDER_NOT_READY', async () => {
    const created = await request(testApp.server)
      .post('/api/orders')
      .set(auth(buyerToken))
      .send({ items: [{ offerId, quantity: 5 }], deliveryMethod: 'pickup' });
    const pending = created.body[0].id as string;
    const response = await request(testApp.server)
      .post('/api/deliveries')
      .set(auth(buyerToken))
      .send(deliveryBody(pending));
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('DELIVERY_ORDER_NOT_READY');
  });

  it('заявку создаёт только участник заказа — чужой 404', async () => {
    orderId = await confirmedOrder();
    const response = await request(testApp.server)
      .post('/api/deliveries')
      .set(auth(strangerToken))
      .send(deliveryBody(orderId));
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('ORDER_NOT_FOUND');
  });

  it('покупатель создаёт заявку: номер DL, PENDING, уведомление продавцу', async () => {
    const response = await request(testApp.server)
      .post('/api/deliveries')
      .set(auth(buyerToken))
      .send(deliveryBody(orderId));
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('PENDING');
    expect(response.body.number).toMatch(/^DL-\d{4}-\d{6}$/);
    expect(response.body.orderNumber).toMatch(/^BZ-\d{4}-\d{6}$/);
    expect(response.body.carrierName).toBeNull();
    expect(response.body.events.map((e: { type: string }) => e.type)).toEqual([
      'CREATED',
    ]);
    deliveryId = response.body.id as string;

    const notifications = await request(testApp.server)
      .get('/api/notifications')
      .set(auth(sellerToken));
    const deliveryNote = notifications.body.items.find(
      (n: { type: string }) => n.type === 'NEW_DELIVERY',
    );
    expect(deliveryNote).toBeDefined();
    expect(deliveryNote.title).toContain(response.body.number);
  });

  it('дубликат активной заявки — 400 DELIVERY_ALREADY_EXISTS', async () => {
    const response = await request(testApp.server)
      .post('/api/deliveries')
      .set(auth(buyerToken))
      .send(deliveryBody(orderId));
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('DELIVERY_ALREADY_EXISTS');
  });

  it('карточка доставки в заказе покупателя и продавца', async () => {
    const buyerOrder = await request(testApp.server)
      .get(`/api/orders/${orderId}`)
      .set(auth(buyerToken));
    expect(buyerOrder.status).toBe(200);
    expect(buyerOrder.body.delivery).toMatchObject({
      id: deliveryId,
      status: 'PENDING',
      carrierName: null,
    });

    const sellerOrder = await request(testApp.server)
      .get(`/api/seller/orders/${orderId}`)
      .set(auth(sellerToken))
      .set('X-Organization-Id', orgId);
    expect(sellerOrder.status).toBe(200);
    expect(sellerOrder.body.delivery.number).toMatch(/^DL-/);
  });

  it('лента feed содержит заявку, mine пуст; детали перевозчику', async () => {
    const feed = await request(testApp.server)
      .get('/api/carrier/deliveries?scope=feed')
      .set(carrierHeaders());
    expect(feed.status).toBe(200);
    expect(feed.body.total).toBe(1);
    expect(feed.body.items[0].id).toBe(deliveryId);
    expect(feed.body.items[0].requesterName).toBe('Мария');

    const mine = await request(testApp.server)
      .get('/api/carrier/deliveries?scope=mine')
      .set(carrierHeaders());
    expect(mine.body.total).toBe(0);

    const detail = await request(testApp.server)
      .get(`/api/carrier/deliveries/${deliveryId}`)
      .set(carrierHeaders());
    expect(detail.status).toBe(200);
    expect(detail.body.pickupAddress).toContain('Шоссейная');
    expect(detail.body.weightKg).toBe(60);
  });

  it('детали заявки: участникам можно, чужим и чужой организации — 404', async () => {
    const asBuyer = await request(testApp.server)
      .get(`/api/deliveries/${deliveryId}`)
      .set(auth(buyerToken));
    expect(asBuyer.status).toBe(200);

    const asStranger = await request(testApp.server)
      .get(`/api/deliveries/${deliveryId}`)
      .set(auth(strangerToken));
    expect(asStranger.status).toBe(404);

    const asOtherOrg = await request(testApp.server)
      .get(`/api/carrier/deliveries/${deliveryId}`)
      .set(carrierHeaders(otherCarrierToken, otherCarrierOrgId));
    expect(asOtherOrg.status).toBe(200); // PENDING видна в ленте
  });

  it('принятие атомарно: PENDING → ACCEPTED, гонку проигрывает второй', async () => {
    const accepted = await request(testApp.server)
      .post(`/api/carrier/deliveries/${deliveryId}/accept`)
      .set(carrierHeaders())
      .send({ price: 15000 });
    expect(accepted.status).toBe(200);
    expect(accepted.body.status).toBe('ACCEPTED');
    expect(accepted.body.price).toBe(15000);
    expect(accepted.body.carrierName).toBe('Транс-Логистик');
    expect(accepted.body.events.map((e: { type: string }) => e.type)).toEqual([
      'CREATED',
      'ACCEPTED',
    ]);

    // Вторая организация опоздала — заявка уже принята.
    const late = await request(testApp.server)
      .post(`/api/carrier/deliveries/${deliveryId}/accept`)
      .set(carrierHeaders(otherCarrierToken, otherCarrierOrgId))
      .send({ price: 9999 });
    expect(late.status).toBe(404);

    // Из ленты свободных заявка исчезла, в mine появилась.
    const feed = await request(testApp.server)
      .get('/api/carrier/deliveries?scope=feed')
      .set(carrierHeaders());
    expect(feed.body.total).toBe(0);
    const mine = await request(testApp.server)
      .get('/api/carrier/deliveries?scope=mine')
      .set(carrierHeaders());
    expect(mine.body.total).toBe(1);

    // Чужая организация не видит активную заявку в деталях.
    const hidden = await request(testApp.server)
      .get(`/api/carrier/deliveries/${deliveryId}`)
      .set(carrierHeaders(otherCarrierToken, otherCarrierOrgId));
    expect(hidden.status).toBe(404);

    // Покупателю пришло уведомление о принятии.
    const notifications = await request(testApp.server)
      .get('/api/notifications')
      .set(auth(buyerToken));
    const status = notifications.body.items.find(
      (n: { type: string }) => n.type === 'DELIVERY_STATUS',
    );
    expect(status).toBeDefined();
    expect(status.title).toContain('принята перевозчиком');
  });

  it('полный цикл перевозчика с уведомлениями покупателю', async () => {
    const picked = await request(testApp.server)
      .post(`/api/carrier/deliveries/${deliveryId}/picked-up`)
      .set(carrierHeaders());
    expect(picked.status).toBe(200);
    expect(picked.body.status).toBe('PICKED_UP');

    // Член той же организации-перевозчика может вести рейс (команда).
    const transit = await request(testApp.server)
      .post(`/api/carrier/deliveries/${deliveryId}/in-transit`)
      .set(carrierHeaders(carrier2Token));
    expect(transit.status).toBe(200);
    expect(transit.body.status).toBe('IN_TRANSIT');

    // Повтор того же шага — некорректный переход.
    const repeat = await request(testApp.server)
      .post(`/api/carrier/deliveries/${deliveryId}/in-transit`)
      .set(carrierHeaders());
    expect(repeat.status).toBe(400);
    expect(repeat.body.code).toBe('INVALID_TRANSITION');

    const delivered = await request(testApp.server)
      .post(`/api/carrier/deliveries/${deliveryId}/delivered`)
      .set(carrierHeaders());
    expect(delivered.status).toBe(200);
    expect(delivered.body.status).toBe('DELIVERED');
    expect(delivered.body.events.map((e: { type: string }) => e.type)).toEqual([
      'CREATED',
      'ACCEPTED',
      'PICKED_UP',
      'IN_TRANSIT',
      'DELIVERED',
    ]);
  });

  it('завершение: покупатель подтверждает, перевозчик получает сводку', async () => {
    const byCarrier = await request(testApp.server)
      .post(`/api/deliveries/${deliveryId}/complete`)
      .set(auth(carrierToken));
    expect(byCarrier.status).toBe(404);

    const completed = await request(testApp.server)
      .post(`/api/deliveries/${deliveryId}/complete`)
      .set(auth(buyerToken));
    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe('COMPLETED');

    const notifications = await request(testApp.server)
      .get('/api/notifications')
      .set(auth(carrierToken));
    const done = notifications.body.items.find(
      (n: { title: string; type: string }) =>
        n.title.includes('завершена') && n.type === 'DELIVERY_STATUS',
    );
    expect(done).toBeDefined();
  });

  it('отмена покупателем из PENDING с причиной и уведомлением', async () => {
    const fresh = await confirmedOrder();
    const created = await request(testApp.server)
      .post('/api/deliveries')
      .set(auth(buyerToken))
      .send(deliveryBody(fresh));
    expect(created.status).toBe(200);

    const cancelled = await request(testApp.server)
      .post(`/api/deliveries/${created.body.id}/cancel`)
      .set(auth(buyerToken))
      .send({ reason: 'Передумали, заберём сами' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe('CANCELLED');

    // Продавцу пришло уведомление об отмене.
    const notifications = await request(testApp.server)
      .get('/api/notifications')
      .set(auth(sellerToken));
    const note = notifications.body.items.find(
      (n: { type: string; title: string }) =>
        n.type === 'DELIVERY_CANCELLED' && n.title.includes('отменена'),
    );
    expect(note).toBeDefined();

    // После отмены можно создать новую заявку по тому же заказу.
    const again = await request(testApp.server)
      .post('/api/deliveries')
      .set(auth(buyerToken))
      .send(deliveryBody(fresh));
    expect(again.status).toBe(200);
    expect(again.body.number).not.toBe(created.body.number);
  });

  it('отмена перевозчиком из ACCEPTED; покупателю из ACCEPTED нельзя', async () => {
    const fresh = await confirmedOrder();
    const created = await request(testApp.server)
      .post('/api/deliveries')
      .set(auth(buyerToken))
      .send(deliveryBody(fresh));
    await request(testApp.server)
      .post(`/api/carrier/deliveries/${created.body.id}/accept`)
      .set(carrierHeaders())
      .send({ price: 12000 });

    const byBuyer = await request(testApp.server)
      .post(`/api/deliveries/${created.body.id}/cancel`)
      .set(auth(buyerToken))
      .send({ reason: 'Не хочу' });
    expect(byBuyer.status).toBe(400);
    expect(byBuyer.body.code).toBe('INVALID_TRANSITION');

    const byCarrier = await request(testApp.server)
      .post(`/api/deliveries/${created.body.id}/cancel`)
      .set(auth(carrierToken))
      .send({ reason: 'Машина сломалась' });
    expect(byCarrier.status).toBe(200);
    expect(byCarrier.body.status).toBe('CANCELLED');
  });

  it('перевозчик не может отменить после PICKED_UP', async () => {
    const fresh = await confirmedOrder();
    const created = await request(testApp.server)
      .post('/api/deliveries')
      .set(auth(buyerToken))
      .send(deliveryBody(fresh));
    await request(testApp.server)
      .post(`/api/carrier/deliveries/${created.body.id}/accept`)
      .set(carrierHeaders())
      .send({ price: 12000 });
    await request(testApp.server)
      .post(`/api/carrier/deliveries/${created.body.id}/picked-up`)
      .set(carrierHeaders());

    const response = await request(testApp.server)
      .post(`/api/deliveries/${created.body.id}/cancel`)
      .set(auth(carrierToken))
      .send({ reason: 'Не везу' });
    expect(response.status).toBe(400);
  });

  it('заявку может создать и продавец заказа', async () => {
    const fresh = await confirmedOrder();
    const created = await request(testApp.server)
      .post('/api/deliveries')
      .set(auth(sellerToken))
      .send(deliveryBody(fresh));
    expect(created.status).toBe(200);
    expect(created.body.requesterName).toBe('Продавец Юг');

    // Покупателю пришло уведомление о заявке продавца.
    const notifications = await request(testApp.server)
      .get('/api/notifications')
      .set(auth(buyerToken));
    const note = notifications.body.items.find(
      (n: { type: string; payload: { deliveryId: string } }) =>
        n.type === 'NEW_DELIVERY' && n.payload.deliveryId === created.body.id,
    );
    expect(note).toBeDefined();
  });

  it('отмена без причины — 400 валидации DTO', async () => {
    const fresh = await confirmedOrder();
    const created = await request(testApp.server)
      .post('/api/deliveries')
      .set(auth(buyerToken))
      .send(deliveryBody(fresh));
    const response = await request(testApp.server)
      .post(`/api/deliveries/${created.body.id}/cancel`)
      .set(auth(buyerToken))
      .send({});
    expect(response.status).toBe(400);
  });
});
