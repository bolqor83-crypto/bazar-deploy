/**
 * E2E заказов (Промт 9, Часть E): создание с группировкой по
 * продавцу, нумерация, резерв остатков с откатом (Промт 11 —
 * event-sourced: RESERVED/UNRESERVED), список, деталь, отмена с
 * возвратом остатков, изоляция.
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

describe('Заказы (e2e)', () => {
  let testApp: TestApp;
  let token = '';
  let offerA = '';
  let offerB = '';
  let orgA = '';

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
    orgA = (
      await testApp.prisma.organization.create({
        data: { name: 'Опт-Юг', type: 'WHOLESALE' },
      })
    ).id;
    const orgB = (
      await testApp.prisma.organization.create({
        data: { name: 'Сеть «У дома»', type: 'RETAIL' },
      })
    ).id;
    const tomatoes = await testApp.prisma.product.create({
      data: {
        categoryId: category.id,
        name: 'Помидоры розовые',
        unit: '1 кг',
        description: 'Розовые томаты.',
        images: '[]',
      },
    });
    const cucumbers = await testApp.prisma.product.create({
      data: {
        categoryId: category.id,
        name: 'Огурцы гладкие',
        unit: '1 кг',
        description: 'Гладкие огурцы.',
        images: '[]',
      },
    });
    offerA = (
      await testApp.prisma.productOffer.create({
        data: {
          productId: tomatoes.id,
          organizationId: orgA,
          priceKopecks: 18900,
          minQuantity: 5,
        },
      })
    ).id;
    offerB = (
      await testApp.prisma.productOffer.create({
        data: {
          productId: cucumbers.id,
          organizationId: orgB,
          priceKopecks: 10400,
          minQuantity: 1,
        },
      })
    ).id;
    // Остатки — event-sourced (Промт 11): INITIAL-движение + баланс.
    await seedOfferStock(testApp.prisma, {
      offerId: offerA,
      organizationId: orgA,
      qty: 50,
    });
    await seedOfferStock(testApp.prisma, {
      offerId: offerB,
      organizationId: orgB,
      qty: 30,
    });
  });

  // Заголовок собирается в момент теста: token появляется в beforeEach.
  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('полный флоу: создать → список → деталь → отмена → остаток восстановлен', async () => {
    const stockBefore = await offerAvailable(testApp.prisma, offerA);

    const created = await request(testApp.server)
      .post('/api/orders')
      .set(auth())
      .send({
        items: [{ offerId: offerA, quantity: 10 }],
        deliveryMethod: 'pickup',
        comment: 'Позвонить за час',
      });
    expect(created.status).toBe(200);
    expect(created.body).toHaveLength(1);
    const order = created.body[0];
    expect(order.number).toMatch(/^BZ-\d{4}-\d{6}$/);
    expect(order.status).toBe('PENDING');
    expect(order.subtotal).toBe(189000);
    expect(order.total).toBe(189000);
    expect(order.seller.name).toBe('Опт-Юг');
    // Промт 15, E: группировка на клиенте — по seller.id.
    expect(typeof order.seller.id).toBe('string');
    expect(order.seller.id.length).toBeGreaterThan(0);
    expect(order.items[0].title).toBe('Помидоры розовые');
    expect(order.items[0].quantity).toBe(10);
    expect(order.events[0].type).toBe('CREATED');

    // Остаток зарезервирован (RESERVED: reservedQty += 10).
    const reserved = await offerAvailable(testApp.prisma, offerA);
    expect(reserved).toBe(stockBefore - 10);
    const reservedBalance = await testApp.prisma.stockBalance.findFirstOrThrow({
      where: { offerId: offerA },
    });
    expect(reservedBalance.reservedQty).toBe(10);
    expect(reservedBalance.physicalQty).toBe(50);

    // Список.
    const list = await request(testApp.server).get('/api/orders').set(auth());
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.total).toBe(1);

    // Деталь.
    const detail = await request(testApp.server)
      .get(`/api/orders/${order.id}`)
      .set(auth());
    expect(detail.status).toBe(200);
    expect(detail.body.number).toBe(order.number);

    // Отмена.
    const cancelled = await request(testApp.server)
      .post(`/api/orders/${order.id}/cancel`)
      .set(auth());
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe('CANCELLED');
    expect(cancelled.body.events.at(-1).type).toBe('CANCELLED');

    // Остаток восстановлен (UNRESERVED).
    const restored = await offerAvailable(testApp.prisma, offerA);
    expect(restored).toBe(stockBefore);
    const unreservedBalance =
      await testApp.prisma.stockBalance.findFirstOrThrow({
        where: { offerId: offerA },
      });
    expect(unreservedBalance.reservedQty).toBe(0);
  });

  it('группировка: два продавца → два заказа', async () => {
    const res = await request(testApp.server)
      .post('/api/orders')
      .set(auth())
      .send({
        items: [
          { offerId: offerA, quantity: 5 },
          { offerId: offerB, quantity: 3 },
        ],
        deliveryMethod: 'pickup',
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const sellers = res.body
      .map((o: { seller: { name: string } }) => o.seller.name)
      .sort();
    expect(sellers).toEqual(['Опт-Юг', 'Сеть «У дома»']);
    // Номера уникальны.
    const numbers = res.body.map((o: { number: string }) => o.number);
    expect(new Set(numbers).size).toBe(2);
  });

  it('нумерация последовательная', async () => {
    const first = await request(testApp.server)
      .post('/api/orders')
      .set(auth())
      .send({
        items: [{ offerId: offerA, quantity: 5 }],
        deliveryMethod: 'pickup',
      });
    const second = await request(testApp.server)
      .post('/api/orders')
      .set(auth())
      .send({
        items: [{ offerId: offerB, quantity: 2 }],
        deliveryMethod: 'pickup',
      });
    const n1 = first.body[0].number.split('-').pop();
    const n2 = second.body[0].number.split('-').pop();
    expect(Number(n2)).toBe(Number(n1) + 1);
  });

  it('резерв откатывает всю группу при нехватке', async () => {
    // offerB: остаток 30, просим 10 у A (ok) и 40 у B (fail) — весь заказ не создаётся.
    const res = await request(testApp.server)
      .post('/api/orders')
      .set(auth())
      .send({
        items: [
          { offerId: offerA, quantity: 10 },
          { offerId: offerB, quantity: 40 },
        ],
        deliveryMethod: 'pickup',
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OUT_OF_STOCK');

    // Оба остатка не тронуты (транзакция откатилась).
    expect(await offerAvailable(testApp.prisma, offerA)).toBe(50);
    expect(await offerAvailable(testApp.prisma, offerB)).toBe(30);
    // Движений не появилось.
    const movements = await testApp.prisma.stockMovement.count({
      where: { type: 'RESERVED' },
    });
    expect(movements).toBe(0);

    const list = await request(testApp.server).get('/api/orders').set(auth());
    expect(list.body.total).toBe(0);
  });

  it('доставка недоступна — только самовывоз (валидация)', async () => {
    const res = await request(testApp.server)
      .post('/api/orders')
      .set(auth())
      .send({
        items: [{ offerId: offerA, quantity: 5 }],
        deliveryMethod: 'drone',
      });
    expect(res.status).toBe(400);
  });

  it('отмена только в PENDING/CONFIRMED', async () => {
    const created = await request(testApp.server)
      .post('/api/orders')
      .set(auth())
      .send({
        items: [{ offerId: offerA, quantity: 5 }],
        deliveryMethod: 'pickup',
      });
    const orderId = created.body[0].id;
    await testApp.prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
    });
    const res = await request(testApp.server)
      .post(`/api/orders/${orderId}/cancel`)
      .set(auth());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NOT_CANCELLABLE');
  });

  it('изоляция: Борис не видит заказ Алисы', async () => {
    const created = await request(testApp.server)
      .post('/api/orders')
      .set(auth())
      .send({
        items: [{ offerId: offerA, quantity: 5 }],
        deliveryMethod: 'pickup',
      });
    const orderId = created.body[0].id;
    const boris = await registerUser(testApp.server, '+79005556677', 'Борис');
    const res = await request(testApp.server)
      .get(`/api/orders/${orderId}`)
      .set({ Authorization: `Bearer ${boris.accessToken}` });
    expect(res.status).toBe(404);
  });

  it('фильтр списка по статусу', async () => {
    await request(testApp.server)
      .post('/api/orders')
      .set(auth())
      .send({
        items: [{ offerId: offerA, quantity: 5 }],
        deliveryMethod: 'pickup',
      });
    await request(testApp.server)
      .post('/api/orders')
      .set(auth())
      .send({
        items: [{ offerId: offerB, quantity: 2 }],
        deliveryMethod: 'pickup',
      });

    const all = await request(testApp.server).get('/api/orders').set(auth());
    const firstId = all.body.items[1].id;
    await request(testApp.server)
      .post(`/api/orders/${firstId}/cancel`)
      .set(auth());

    const active = await request(testApp.server)
      .get('/api/orders')
      .query({ status: 'PENDING' })
      .set(auth());
    expect(active.body.total).toBe(1);

    const cancelled = await request(testApp.server)
      .get('/api/orders')
      .query({ status: 'CANCELLED' })
      .set(auth());
    expect(cancelled.body.total).toBe(1);
  });
});
