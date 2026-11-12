/**
 * E2E заказов (Промт 9, Часть E): создание с группировкой по
 * продавцу, нумерация, stock-резерв с откатом, список, деталь,
 * отмена с восстановлением stock, изоляция.
 */
import request from 'supertest';
import {
  clearDatabase,
  createTestApp,
  registerUser,
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
          stock: 50,
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
          stock: 30,
          minQuantity: 1,
        },
      })
    ).id;
  });

  // Заголовок собирается в момент теста: token появляется в beforeEach.
  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('полный флоу: создать → список → деталь → отмена → stock восстановлен', async () => {
    const stockBefore = await testApp.prisma.productOffer.findUniqueOrThrow({
      where: { id: offerA },
      select: { stock: true },
    });

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
    expect(order.items[0].title).toBe('Помидоры розовые');
    expect(order.items[0].quantity).toBe(10);
    expect(order.events[0].type).toBe('CREATED');

    // stock зарезервирован.
    const reserved = await testApp.prisma.productOffer.findUniqueOrThrow({
      where: { id: offerA },
      select: { stock: true },
    });
    expect(reserved.stock).toBe(stockBefore.stock - 10);

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

    // stock восстановлен.
    const restored = await testApp.prisma.productOffer.findUniqueOrThrow({
      where: { id: offerA },
      select: { stock: true },
    });
    expect(restored.stock).toBe(stockBefore.stock);
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

  it('stock-резерв откатывает всю группу при нехватке', async () => {
    // offerB: stock 30, просим 40 у A (ok) и 40 у B (fail) — весь заказ не создаётся.
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

    // Оба склада не тронуты (транзакция откатилась).
    const a = await testApp.prisma.productOffer.findUniqueOrThrow({
      where: { id: offerA },
      select: { stock: true },
    });
    const b = await testApp.prisma.productOffer.findUniqueOrThrow({
      where: { id: offerB },
      select: { stock: true },
    });
    expect(a.stock).toBe(50);
    expect(b.stock).toBe(30);

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
