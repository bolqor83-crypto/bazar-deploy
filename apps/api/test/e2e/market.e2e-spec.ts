/**
 * E2E маршрута по рынку и позиции на рынке (Промт 17, Часть B).
 *
 * Полный цикл: продавцы с позициями на сетке → заказы покупателя
 * в активных статусах → GET /api/market/route строит оптимальный
 * порядок (сверяется с перебором), returnToStart растит метры,
 * PENDING исключён, продавец без позиции — unlocated, чужие
 * orderIds не раскрываются, PATCH /locations/:id ставит и чистит
 * позицию, изоляция без токена — 401.
 */
import request from 'supertest';
import { bruteForceOptimal } from '../../src/market/route-optimizer';
import {
  clearDatabase,
  createTestApp,
  registerUser,
  seedOfferStock,
  type TestApp,
} from './test-app';

/** Шаги демо-сетки (MARKET, ADR 0017). */
const STEPS = { spot: 3, row: 8 };
const ENTRANCE = { row: 0, spot: 0 };

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('Маршрут по рынку (e2e)', () => {
  let testApp: TestApp;
  let buyerToken = '';
  let buyerId = '';
  let otherToken = '';
  let seller1Token = '';
  let seller2Token = '';
  let seller3Token = '';
  let org1Id = '';
  let org2Id = '';
  let org3Id = '';
  let offer1Id = '';
  let offer2Id = '';
  let offer3Id = '';
  let offer4Id = '';

  /** Создать организацию-продавца с оффером и остатком. */
  async function makeSeller(
    phone: string,
    orgName: string,
    productName: string,
    position: { row: number; spot: number } | null,
  ): Promise<{ token: string; orgId: string; offerId: string }> {
    const seller = await registerUser(testApp.server, phone, orgName);
    const org = await testApp.prisma.organization.create({
      data: {
        name: orgName,
        type: 'WHOLESALE',
        memberships: {
          create: { userId: seller.userId, role: 'WHOLESALE_SELLER' },
        },
        ...(position
          ? {
              locations: {
                create: {
                  name: 'Точка на рынке',
                  address: 'Центральный рынок',
                  city: 'Ростов-на-Дону',
                  marketRow: position.row,
                  marketSpot: position.spot,
                },
              },
            }
          : {}),
      },
    });
    const category = await testApp.prisma.category.create({
      data: {
        slug: `kat-${orgName}`,
        name: orgName,
        icon: 'Apple',
        sortOrder: 1,
      },
    });
    const product = await testApp.prisma.product.create({
      data: {
        categoryId: category.id,
        name: productName,
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
    await seedOfferStock(testApp.prisma, {
      offerId: offer.id,
      organizationId: org.id,
      qty: 100,
    });
    return { token: seller.accessToken, orgId: org.id, offerId: offer.id };
  }

  /** Заказ покупателя (pickup) + подтверждение продавцом. */
  async function confirmedOrder(
    offerId: string,
    sellerToken: string,
    sellerOrgId: string,
  ): Promise<{ id: string; number: string }> {
    const created = await request(testApp.server)
      .post('/api/orders')
      .set(auth(buyerToken))
      .send({ items: [{ offerId, quantity: 2 }], deliveryMethod: 'pickup' });
    expect(created.status).toBe(200);
    const orderId = created.body[0].id as string;
    const confirmed = await request(testApp.server)
      .post(`/api/seller/orders/${orderId}/confirm`)
      .set(auth(sellerToken))
      .set('X-Organization-Id', sellerOrgId);
    expect(confirmed.status).toBe(200);
    return { id: orderId, number: created.body[0].number as string };
  }

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
    buyerId = buyer.userId;
    const other = await registerUser(testApp.server, '+79001112299', 'Пётр');
    otherToken = other.accessToken;

    // Три продавца: два на рынке (ряд 1 и ряд 3), один без позиции.
    const s1 = await makeSeller('+79001110001', 'Опт-Юг', 'Бананы', {
      row: 3,
      spot: 12,
    });
    seller1Token = s1.token;
    org1Id = s1.orgId;
    offer1Id = s1.offerId;
    const s2 = await makeSeller('+79001110002', 'Сеть У дома', 'Огурцы', {
      row: 1,
      spot: 8,
    });
    seller2Token = s2.token;
    org2Id = s2.orgId;
    offer2Id = s2.offerId;
    const s3 = await makeSeller('+79001110003', 'Ромашка', 'Морковь', null);
    seller3Token = s3.token;
    org3Id = s3.orgId;
    offer3Id = s3.offerId;

    // Четвёртый оффер первого продавца (несколько заказов у одного):
    // продукт в той же категории, что и «Бананы».
    const bananasOffer = await testApp.prisma.productOffer.findUniqueOrThrow({
      where: { id: offer1Id },
      select: { product: { select: { categoryId: true } } },
    });
    const product4 = await testApp.prisma.product.create({
      data: {
        categoryId: bananasOffer.product.categoryId,
        name: 'Бананы премиум',
        unit: '1 кг',
        description: 'Описание.',
        images: '[]',
      },
    });
    const offer4 = await testApp.prisma.productOffer.create({
      data: {
        productId: product4.id,
        organizationId: org1Id,
        priceKopecks: 15_000,
        minQuantity: 1,
      },
    });
    await seedOfferStock(testApp.prisma, {
      offerId: offer4.id,
      organizationId: org1Id,
      qty: 100,
    });
    offer4Id = offer4.id;
    void buyerId;
  });

  it('без токена — 401', async () => {
    const res = await request(testApp.server).get('/api/market/route');
    expect(res.status).toBe(401);
  });

  it('маршрут из 3 заказов: порядок оптимален, метры сходятся', async () => {
    // Заказы создаются в «плохом» порядке: сначала дальний (3,12),
    // потом ближний (1,8), потом снова дальний. Оптимум — от входа.
    await confirmedOrder(offer1Id, seller1Token, org1Id);
    await confirmedOrder(offer2Id, seller2Token, org2Id);
    const third = await confirmedOrder(offer4Id, seller1Token, org1Id);
    const res = await request(testApp.server)
      .get('/api/market/route')
      .set(auth(buyerToken));
    expect(res.status).toBe(200);
    const body = res.body;
    expect(body.market).toEqual({
      rows: 4,
      spots: 40,
      entrance: { row: 0, spot: 0 },
    });
    expect(body.stops).toHaveLength(3);
    expect(body.truncated).toBe(false);
    expect(body.unlocated).toEqual([]);

    // Порядок оптимален: сверка с полным перебором.
    const stopPoints = [
      { id: 'o1', row: 3, spot: 12 },
      { id: 'o2', row: 1, spot: 8 },
      { id: 'o3', row: 3, spot: 12 },
    ];
    const brute = bruteForceOptimal(stopPoints, ENTRANCE, STEPS, false);
    expect(body.totalMeters).toBe(brute);
    // Метры и минуты сходятся с плечами.
    const legsSum = (body.stops as { legMeters: number }[]).reduce(
      (acc, s) => acc + s.legMeters,
      0,
    );
    expect(legsSum).toBe(body.totalMeters);
    expect(body.estimatedMinutes).toBe(Math.ceil(body.totalMeters / 1.2 / 60));
    // Первая остановка — ближайшая ко входу (1,8).
    expect(body.stops[0].row).toBe(1);
    expect(body.stops[0].spot).toBe(8);
    expect(body.stops[0].seller.name).toBe('Сеть У дома');
    // Поля остановки.
    expect(body.stops[0]).toMatchObject({
      status: 'CONFIRMED',
      itemsCount: 1,
      total: 20_000,
    });
    expect(typeof body.stops[0].orderNumber).toBe('string');
    // Заказ к не-первому офферу тоже в маршруте.
    const numbers = (body.stops as { orderNumber: string }[]).map(
      (s) => s.orderNumber,
    );
    expect(numbers).toContain(third.number);
  }, 120_000);

  it('returnToStart: метры растут, возврат от последней точки', async () => {
    await confirmedOrder(offer1Id, seller1Token, org1Id);
    await confirmedOrder(offer2Id, seller2Token, org2Id);

    const open = await request(testApp.server)
      .get('/api/market/route')
      .set(auth(buyerToken));
    const cycle = await request(testApp.server)
      .get('/api/market/route?returnToStart=true')
      .set(auth(buyerToken));
    expect(cycle.status).toBe(200);
    expect(cycle.body.returnToStart).toBe(true);
    expect(typeof cycle.body.returnLegMeters).toBe('number');
    expect(cycle.body.totalMeters).toBeGreaterThan(open.body.totalMeters);
    const stops = cycle.body.stops as {
      row: number;
      spot: number;
    }[];
    const last = stops[stops.length - 1];
    expect(cycle.body.returnLegMeters).toBe(
      last.row * STEPS.row + last.spot * STEPS.spot,
    );
  });

  it('PENDING исключён из маршрута', async () => {
    // Заказ без confirm остаётся PENDING.
    const created = await request(testApp.server)
      .post('/api/orders')
      .set(auth(buyerToken))
      .send({
        items: [{ offerId: offer1Id, quantity: 2 }],
        deliveryMethod: 'pickup',
      });
    expect(created.status).toBe(200);
    const res = await request(testApp.server)
      .get('/api/market/route')
      .set(auth(buyerToken));
    expect(res.status).toBe(200);
    expect(res.body.stops).toHaveLength(0);
    expect(res.body.totalMeters).toBe(0);
    expect(res.body.estimatedMinutes).toBe(0);
  });

  it('продавец без позиции — заказ в unlocated, не в маршруте', async () => {
    await confirmedOrder(offer3Id, seller3Token, org3Id);
    await confirmedOrder(offer2Id, seller2Token, org2Id);

    const res = await request(testApp.server)
      .get('/api/market/route')
      .set(auth(buyerToken));
    expect(res.status).toBe(200);
    expect(res.body.stops).toHaveLength(1);
    expect(res.body.unlocated).toHaveLength(1);
    expect(res.body.unlocated[0].sellerName).toBe('Ромашка');
    expect(res.body.unlocated[0].orderId).toBeTruthy();
    expect(res.body.unlocated[0].orderNumber).toBeTruthy();
  });

  it('чужие orderIds молча игнорируются', async () => {
    const mine = await confirmedOrder(offer1Id, seller1Token, org1Id);
    // Заказ другого покупателя.
    const foreign = await request(testApp.server)
      .post('/api/orders')
      .set(auth(otherToken))
      .send({
        items: [{ offerId: offer2Id, quantity: 3 }],
        deliveryMethod: 'pickup',
      });
    const foreignId = foreign.body[0].id as string;

    const res = await request(testApp.server)
      .get(`/api/market/route?orderIds=${mine.id},${foreignId},не-существует`)
      .set(auth(buyerToken));
    expect(res.status).toBe(200);
    expect(res.body.stops).toHaveLength(1);
    expect(res.body.stops[0].orderId).toBe(mine.id);
  });

  it('maxStops: 21 активный заказ — усечение до 20, truncated', async () => {
    for (let i = 0; i < 21; i += 1) {
      await confirmedOrder(
        i % 2 === 0 ? offer1Id : offer2Id,
        i % 2 === 0 ? seller1Token : seller2Token,
        i % 2 === 0 ? org1Id : org2Id,
      );
    }
    const res = await request(testApp.server)
      .get('/api/market/route')
      .set(auth(buyerToken));
    expect(res.status).toBe(200);
    expect(res.body.stops).toHaveLength(20);
    expect(res.body.truncated).toBe(true);
  }, 300_000);

  it('PATCH /locations/:id — ставит и чистит позицию', async () => {
    // Локация без позиции у продавца с позицией в другом месте.
    const location = await testApp.prisma.businessLocation.create({
      data: {
        organizationId: org3Id,
        name: 'Городская точка',
        address: 'ул. Городская, 1',
        city: 'Ростов-на-Дону',
      },
    });
    const set = await request(testApp.server)
      .patch(`/api/locations/${location.id}`)
      .set(auth(seller3Token))
      .send({ marketRow: 4, marketSpot: 20 });
    expect(set.status).toBe(200);
    expect(set.body.marketRow).toBe(4);
    expect(set.body.marketSpot).toBe(20);

    // Маршрут теперь включает продавца 3.
    await confirmedOrder(offer3Id, seller3Token, org3Id);
    const withPosition = await request(testApp.server)
      .get('/api/market/route')
      .set(auth(buyerToken));
    expect(withPosition.body.stops).toHaveLength(1);

    // Очистка: null — позиция снята, заказ уходит в unlocated.
    const cleared = await request(testApp.server)
      .patch(`/api/locations/${location.id}`)
      .set(auth(seller3Token))
      .send({ marketRow: null, marketSpot: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.marketRow).toBeNull();
    expect(cleared.body.marketSpot).toBeNull();
    const without = await request(testApp.server)
      .get('/api/market/route')
      .set(auth(buyerToken));
    expect(without.body.stops).toHaveLength(0);
    expect(without.body.unlocated).toHaveLength(1);
  });

  it('PATCH /locations/:id — границы и чужая точка', async () => {
    const location = await testApp.prisma.businessLocation.create({
      data: {
        organizationId: org1Id,
        name: 'Точка Опт-Юга',
        address: 'ул. Оптовая, 7',
        city: 'Ростов-на-Дону',
      },
    });
    // Ряд вне сетки.
    const badRow = await request(testApp.server)
      .patch(`/api/locations/${location.id}`)
      .set(auth(seller1Token))
      .send({ marketRow: 5, marketSpot: 10 });
    expect(badRow.status).toBe(400);
    // Место вне сетки.
    const badSpot = await request(testApp.server)
      .patch(`/api/locations/${location.id}`)
      .set(auth(seller1Token))
      .send({ marketRow: 2, marketSpot: 41 });
    expect(badSpot.status).toBe(400);
    // Только ряд без места.
    const partial = await request(testApp.server)
      .patch(`/api/locations/${location.id}`)
      .set(auth(seller1Token))
      .send({ marketRow: 2 });
    expect(partial.status).toBe(400);
    // Чужая точка — 404 без раскрытия.
    const foreign = await request(testApp.server)
      .patch(`/api/locations/${location.id}`)
      .set(auth(seller2Token))
      .send({ marketRow: 2, marketSpot: 10 });
    expect(foreign.status).toBe(404);
  });

  it('PUT/GET/DELETE /market/position — позиция организации', async () => {
    // У Опт-Юга (org1) уже есть позиция (3,12) — PUT переносит её.
    const moved = await request(testApp.server)
      .put('/api/market/position')
      .set(auth(seller1Token))
      .set('X-Organization-Id', org1Id)
      .send({ marketRow: 2, marketSpot: 33 });
    expect(moved.status).toBe(200);
    expect(moved.body.marketRow).toBe(2);
    expect(moved.body.marketSpot).toBe(33);

    const read = await request(testApp.server)
      .get('/api/market/position')
      .set(auth(seller1Token))
      .set('X-Organization-Id', org1Id);
    expect(read.status).toBe(200);
    expect(read.body.position).toMatchObject({
      marketRow: 2,
      marketSpot: 33,
    });
    expect(read.body.position.name).toBe('Точка на рынке');

    // Покупатель без членства — 403/404, не продавец.
    const forbidden = await request(testApp.server)
      .put('/api/market/position')
      .set(auth(buyerToken))
      .set('X-Organization-Id', org1Id)
      .send({ marketRow: 1, marketSpot: 1 });
    expect([403, 404]).toContain(forbidden.status);

    // DELETE снимает.
    const removed = await request(testApp.server)
      .delete('/api/market/position')
      .set(auth(seller1Token))
      .set('X-Organization-Id', org1Id);
    expect(removed.status).toBe(200);
    expect(removed.body.cleared).toBe(true);
    const after = await request(testApp.server)
      .get('/api/market/position')
      .set(auth(seller1Token))
      .set('X-Organization-Id', org1Id);
    expect(after.body.position).toBeNull();
  });

  it('PUT /market/position создаёт «Точку на рынке» у организации без точек', async () => {
    // org2 уже с локацией (позиция 1,8): PUT должен переиспользовать её.
    const before = await testApp.prisma.businessLocation.count({
      where: { organizationId: org2Id },
    });
    const saved = await request(testApp.server)
      .put('/api/market/position')
      .set(auth(seller2Token))
      .set('X-Organization-Id', org2Id)
      .send({ marketRow: 4, marketSpot: 15 });
    expect(saved.status).toBe(200);
    const after = await testApp.prisma.businessLocation.count({
      where: { organizationId: org2Id },
    });
    expect(after).toBe(before); // новая точка не создаётся

    // У org3 нет точек: PUT создаёт «Точку на рынке».
    const created = await request(testApp.server)
      .put('/api/market/position')
      .set(auth(seller3Token))
      .set('X-Organization-Id', org3Id)
      .send({ marketRow: 1, marketSpot: 2 });
    expect(created.status).toBe(200);
    expect(created.body.name).toBe('Точка на рынке');
    expect(created.body.marketRow).toBe(1);
    const org3Locations = await testApp.prisma.businessLocation.count({
      where: { organizationId: org3Id },
    });
    expect(org3Locations).toBe(1);
  });
});
