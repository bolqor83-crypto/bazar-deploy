/**
 * E2E склада: /api/stock/* (Промт 11).
 *
 * Сценарии: guard (без org / без membership), полный флоу движений
 * (INITIAL через оффер → приход → списание → перемещение),
 * сводка и журнал, заказ → резерв → подтверждение → продажа,
 * отмена PENDING/CONFIRMED с возвратом, изоляция организаций.
 */
import request from 'supertest';
import {
  clearDatabase,
  createTestApp,
  offerAvailable,
  registerUser,
  type TestApp,
} from './test-app';

describe('Stock (e2e)', () => {
  let testApp: TestApp;
  let sellerToken: string;
  let strangerToken: string;
  let buyerToken: string;
  let orgId: string;
  let otherOrgId: string;
  let offerId: string;
  let warehouseId: string;
  let storeId: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    await clearDatabase(testApp.prisma);

    const seller = await registerUser(
      testApp.server,
      '+79003110001',
      'Продавец',
    );
    sellerToken = seller.accessToken;
    const stranger = await registerUser(
      testApp.server,
      '+79003110002',
      'Чужой',
    );
    strangerToken = stranger.accessToken;
    const buyer = await registerUser(testApp.server, '+79003110003', 'Мария');
    buyerToken = buyer.accessToken;

    // Организация продавца (onboarding создаст default-склад).
    const org = await testApp.prisma.organization.create({
      data: {
        name: 'Опт-Юг',
        type: 'WHOLESALE',
        memberships: {
          create: { userId: seller.userId, role: 'WHOLESALE_SELLER' },
        },
        // Промт 11: default-склад создаётся вместе с организацией.
        stockLocations: {
          create: [
            {
              name: 'Основной склад',
              type: 'WAREHOUSE',
              isDefault: true,
            },
          ],
        },
      },
    });
    orgId = org.id;
    const otherOrg = await testApp.prisma.organization.create({
      data: {
        name: 'Другой опт',
        type: 'WHOLESALE',
        memberships: {
          create: { userId: stranger.userId, role: 'WHOLESALE_SELLER' },
        },
      },
    });
    otherOrgId = otherOrg.id;

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
    offerId = (
      await testApp.prisma.productOffer.create({
        data: {
          productId: product.id,
          organizationId: orgId,
          priceKopecks: 18900,
          minQuantity: 5,
        },
      })
    ).id;

    const locations = await testApp.prisma.stockLocation.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
    });
    warehouseId = locations[0].id;
  });

  afterAll(async () => {
    await testApp.close();
  });

  /** Заголовки продавца. */
  const sellerHeaders = () => ({
    Authorization: `Bearer ${sellerToken}`,
    'X-Organization-Id': orgId,
  });

  // -------------------------------------------------------------------
  // Guard
  // -------------------------------------------------------------------

  it('без X-Organization-Id — 400 SELLER_NO_ORGANIZATION', async () => {
    const response = await request(testApp.server)
      .get('/api/stock/locations')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('SELLER_NO_ORGANIZATION');
  });

  it('без членства — 403 SELLER_FORBIDDEN', async () => {
    const response = await request(testApp.server)
      .get('/api/stock/locations')
      .set('Authorization', `Bearer ${strangerToken}`)
      .set('X-Organization-Id', orgId);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('SELLER_FORBIDDEN');
  });

  it('без JWT — 401', async () => {
    const response = await request(testApp.server).get('/api/stock/locations');
    expect(response.status).toBe(401);
  });

  // -------------------------------------------------------------------
  // Склады
  // -------------------------------------------------------------------

  it('список складов: default «Основной склад» от onboarding', async () => {
    const response = await request(testApp.server)
      .get('/api/stock/locations')
      .set(sellerHeaders());
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      name: 'Основной склад',
      type: 'WAREHOUSE',
      isDefault: true,
    });
    expect(response.body[0].id).toBe(warehouseId);
  });

  it('создание склада STORE; isDefault единственный', async () => {
    const response = await request(testApp.server)
      .post('/api/stock/locations')
      .set(sellerHeaders())
      .send({
        name: 'Точка на Садовой',
        type: 'STORE',
        address: 'ул. Садовая, 12',
      });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'Точка на Садовой',
      type: 'STORE',
      isDefault: false,
    });
    storeId = response.body.id;
  });

  it('обновление склада', async () => {
    const response = await request(testApp.server)
      .patch(`/api/stock/locations/${storeId}`)
      .set(sellerHeaders())
      .send({ address: 'ул. Садовая, 14' });
    expect(response.status).toBe(200);
    expect(response.body.address).toBe('ул. Садовая, 14');
  });

  it('чужой склад — 404 (без раскрытия)', async () => {
    const response = await request(testApp.server)
      .patch(`/api/stock/locations/${storeId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .set('X-Organization-Id', otherOrgId)
      .send({ name: 'Взлом' });
    expect(response.status).toBe(404);
  });

  // -------------------------------------------------------------------
  // Движения: полный флоу
  // -------------------------------------------------------------------

  it('приход (RECEIPT) на default-склад', async () => {
    const response = await request(testApp.server)
      .post('/api/stock/movements')
      .set(sellerHeaders())
      .send({
        offerId,
        type: 'RECEIPT',
        quantity: 100,
        reason: 'Закупка у фермера',
      });
    expect(response.status).toBe(201);
    expect(response.body.balance).toMatchObject({
      physicalQty: 100,
      reservedQty: 0,
      availableQty: 100,
    });
    expect(response.body.totals.availableQty).toBe(100);
  });

  it('списание (WRITE_OFF) уменьшает доступность + уведомление', async () => {
    const response = await request(testApp.server)
      .post('/api/stock/movements')
      .set(sellerHeaders())
      .send({
        offerId,
        type: 'WRITE_OFF',
        quantity: 20,
        reason: 'Порча при перевозке',
      });
    expect(response.status).toBe(201);
    expect(response.body.totals.availableQty).toBe(80);

    // Уведомление продавцу о списании.
    const notifications = await request(testApp.server)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(notifications.body.total).toBe(1);
    expect(notifications.body.items[0].type).toBe('STOCK_WRITE_OFF');
    expect(notifications.body.items[0].body).toContain('20');
  });

  it('списание сверх остатка — 400 OUT_OF_STOCK', async () => {
    const response = await request(testApp.server)
      .post('/api/stock/movements')
      .set(sellerHeaders())
      .send({
        offerId,
        type: 'WRITE_OFF',
        quantity: 81,
        reason: 'Слишком много',
      });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('OUT_OF_STOCK');
  });

  it('корректировка (ADJUSTMENT) может увести в минус', async () => {
    const response = await request(testApp.server)
      .post('/api/stock/movements')
      .set(sellerHeaders())
      .send({
        offerId,
        type: 'ADJUSTMENT',
        quantity: -85,
        reason: 'Инвентаризация: недостача',
      });
    expect(response.status).toBe(201);
    expect(response.body.totals.availableQty).toBe(-5);
    // Вернём остаток корректировкой.
    const restore = await request(testApp.server)
      .post('/api/stock/movements')
      .set(sellerHeaders())
      .send({
        offerId,
        type: 'ADJUSTMENT',
        quantity: 85,
        reason: 'Нашли на втором складе',
      });
    expect(restore.status).toBe(201);
    expect(restore.body.totals.availableQty).toBe(80);
  });

  it('валидация: quantity <= 0 и короткий reason — 400', async () => {
    const badQuantity = await request(testApp.server)
      .post('/api/stock/movements')
      .set(sellerHeaders())
      .send({ offerId, type: 'RECEIPT', quantity: 0, reason: 'Ноль' });
    expect(badQuantity.status).toBe(400);

    const badReason = await request(testApp.server)
      .post('/api/stock/movements')
      .set(sellerHeaders())
      .send({ offerId, type: 'RECEIPT', quantity: 5, reason: 'ок' });
    expect(badReason.status).toBe(400);
  });

  it('перемещение (transfer): пара движений, суммы сходятся', async () => {
    const response = await request(testApp.server)
      .post('/api/stock/transfer')
      .set(sellerHeaders())
      .send({
        offerId,
        fromLocationId: warehouseId,
        toLocationId: storeId,
        quantity: 30,
        reason: 'Развоз по точкам',
      });
    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(2);
    const byLocation = new Map(
      response.body.items.map(
        (b: { locationId: string; availableQty: number }) => [
          b.locationId,
          b.availableQty,
        ],
      ),
    );
    expect(byLocation.get(warehouseId)).toBe(50);
    expect(byLocation.get(storeId)).toBe(30);
    expect(await offerAvailable(testApp.prisma, offerId)).toBe(80);

    // Те же склады — 400.
    const same = await request(testApp.server)
      .post('/api/stock/transfer')
      .set(sellerHeaders())
      .send({
        offerId,
        fromLocationId: warehouseId,
        toLocationId: warehouseId,
        quantity: 5,
        reason: 'Туда же',
      });
    expect(same.status).toBe(400);
    expect(same.body.code).toBe('STOCK_SAME_LOCATION');
  });

  it('журнал движений: фильтры по типу и складу, пагинация', async () => {
    const all = await request(testApp.server)
      .get('/api/stock/movements')
      .set(sellerHeaders());
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(6);
    expect(all.body.items[0].offerTitle).toBe('Помидоры розовые');

    const receipts = await request(testApp.server)
      .get('/api/stock/movements?type=RECEIPT')
      .set(sellerHeaders());
    expect(receipts.body.total).toBe(1);

    const transfers = await request(testApp.server)
      .get('/api/stock/movements?type=TRANSFER_OUT')
      .set(sellerHeaders());
    expect(transfers.body.total).toBe(1);
    expect(transfers.body.items[0].quantityDelta).toBe(-30);

    const page = await request(testApp.server)
      .get('/api/stock/movements?page=1&pageSize=2')
      .set(sellerHeaders());
    expect(page.body.items).toHaveLength(2);
    expect(page.body.hasMore).toBe(true);
  });

  it('остатки: список, конкретный, сводка', async () => {
    const list = await request(testApp.server)
      .get('/api/stock/balances')
      .set(sellerHeaders());
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(2);

    const one = await request(testApp.server)
      .get(`/api/stock/balances/${offerId}/${storeId}`)
      .set(sellerHeaders());
    expect(one.status).toBe(200);
    expect(one.body).toMatchObject({
      availableQty: 30,
      locationName: 'Точка на Садовой',
    });

    const summary = await request(testApp.server)
      .get(`/api/stock/summary?offerId=${offerId}`)
      .set(sellerHeaders());
    expect(summary.status).toBe(200);
    expect(summary.body).toMatchObject({
      physicalQty: 80,
      reservedQty: 0,
      availableQty: 80,
      locationsCount: 2,
    });
  });

  // -------------------------------------------------------------------
  // Заказы × склад: резерв → продажа → возврат
  // -------------------------------------------------------------------

  it('заказ резервирует остаток (RESERVED), подтверждение продаёт (SALE_OUT + UNRESERVED)', async () => {
    // available 80 (50 основной + 30 точка) → резервируем 60.
    const order = await request(testApp.server)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        items: [{ offerId, quantity: 60 }],
        deliveryMethod: 'pickup',
      });
    expect(order.status).toBe(200);
    expect(order.body).toHaveLength(1);
    const orderId = order.body[0].id;

    // Резерв по двум складам (FIFO: основной 50, затем точка 10).
    expect(await offerAvailable(testApp.prisma, offerId)).toBe(20);
    const balances = await testApp.prisma.stockBalance.findMany({
      where: { offerId },
    });
    const reservedSum = balances.reduce((sum, b) => sum + b.reservedQty, 0);
    expect(reservedSum).toBe(60);
    const reservedMovements = await testApp.prisma.stockMovement.count({
      where: { refType: 'order', refId: orderId, type: 'RESERVED' },
    });
    expect(reservedMovements).toBe(2);

    // Подтверждение: SALE_OUT списывает физику, UNRESERVED снимает резерв.
    const confirm = await request(testApp.server)
      .post(`/api/seller/orders/${orderId}/confirm`)
      .set(sellerHeaders());
    expect(confirm.status).toBe(200);

    const after = await testApp.prisma.stockBalance.findMany({
      where: { offerId },
    });
    expect(after.reduce((s, b) => s + b.physicalQty, 0)).toBe(20);
    expect(after.reduce((s, b) => s + b.reservedQty, 0)).toBe(0);
    expect(await offerAvailable(testApp.prisma, offerId)).toBe(20);
    expect(
      await testApp.prisma.stockMovement.count({
        where: { refType: 'order', refId: orderId, type: 'SALE_OUT' },
      }),
    ).toBe(2);
  });

  it('отмена CONFIRMED-заказа возвращает товар (RETURN_IN)', async () => {
    const order = await request(testApp.server)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        items: [{ offerId, quantity: 10 }],
        deliveryMethod: 'pickup',
      });
    const orderId = order.body[0].id;
    expect(await offerAvailable(testApp.prisma, offerId)).toBe(10);

    await request(testApp.server)
      .post(`/api/seller/orders/${orderId}/confirm`)
      .set(sellerHeaders());
    expect(await offerAvailable(testApp.prisma, offerId)).toBe(10);

    const cancel = await request(testApp.server)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(cancel.status).toBe(200);

    // Промт 11: проданный товар вернулся (RETURN_IN).
    expect(await offerAvailable(testApp.prisma, offerId)).toBe(20);
    const returns = await testApp.prisma.stockMovement.count({
      where: { refType: 'order', refId: orderId, type: 'RETURN_IN' },
    });
    expect(returns).toBe(1);
  });

  it('отмена PENDING-заказа снимает резерв (UNRESERVED)', async () => {
    const order = await request(testApp.server)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        items: [{ offerId, quantity: 5 }],
        deliveryMethod: 'pickup',
      });
    const orderId = order.body[0].id;
    expect(await offerAvailable(testApp.prisma, offerId)).toBe(15);

    const cancel = await request(testApp.server)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(cancel.status).toBe(200);
    expect(await offerAvailable(testApp.prisma, offerId)).toBe(20);
    const unreserves = await testApp.prisma.stockMovement.count({
      where: { refType: 'order', refId: orderId, type: 'UNRESERVED' },
    });
    expect(unreserves).toBe(1);
  });

  // -------------------------------------------------------------------
  // Изоляция
  // -------------------------------------------------------------------

  it('изоляция: чужая организация не видит остатки и журнал', async () => {
    const balances = await request(testApp.server)
      .get('/api/stock/balances')
      .set('Authorization', `Bearer ${strangerToken}`)
      .set('X-Organization-Id', otherOrgId);
    expect(balances.status).toBe(200);
    expect(balances.body.total).toBe(0);

    const movements = await request(testApp.server)
      .get('/api/stock/movements')
      .set('Authorization', `Bearer ${strangerToken}`)
      .set('X-Organization-Id', otherOrgId);
    expect(movements.status).toBe(200);
    expect(movements.body.total).toBe(0);

    // Чужое движение по офферу — 404.
    const movement = await request(testApp.server)
      .post('/api/stock/movements')
      .set('Authorization', `Bearer ${strangerToken}`)
      .set('X-Organization-Id', otherOrgId)
      .send({
        offerId,
        type: 'RECEIPT',
        quantity: 5,
        reason: 'Взлом чужого склада',
      });
    expect(movement.status).toBe(404);
  });

  it('удаление склада с движениями — 409, без движений — ок', async () => {
    const withMovements = await request(testApp.server)
      .delete(`/api/stock/locations/${warehouseId}`)
      .set(sellerHeaders());
    expect(withMovements.status).toBe(409);
    expect(withMovements.body.code).toBe('STOCK_LOCATION_HAS_MOVEMENTS');

    const fresh = await request(testApp.server)
      .post('/api/stock/locations')
      .set(sellerHeaders())
      .send({ name: 'Временный склад', type: 'OTHER' });
    const removed = await request(testApp.server)
      .delete(`/api/stock/locations/${fresh.body.id}`)
      .set(sellerHeaders());
    expect(removed.status).toBe(200);
    expect(removed.body).toEqual({ deleted: true });
  });
});
