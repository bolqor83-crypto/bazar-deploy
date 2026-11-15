/**
 * Unit-тесты StockService (Промт 11): склады (CRUD, default при
 * онбординге), ручные движения (RECEIPT/WRITE_OFF/ADJUSTMENT),
 * границы (не уходит в минус, ADJUSTMENT может), перемещения,
 * остатки и журнал. Полные сценарии (guard, FOR UPDATE) — e2e.
 */
import { NotFoundException } from '@nestjs/common';
import { StockService } from '../../src/stock/stock.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { FakeCartPrisma } from './fake-cart-prisma';

describe('StockService (unit)', () => {
  let service: StockService;
  let prisma: FakeCartPrisma;

  const SELLER = { userId: 'user-1', organizationId: 'org-1' };
  const OTHER_ORG = 'org-2';

  beforeEach(() => {
    prisma = new FakeCartPrisma();
    service = new StockService(prisma as unknown as PrismaService);

    prisma.offers.set('offer-1', {
      id: 'offer-1',
      productId: 'product-1',
      organizationId: 'org-1',
      priceKopecks: 18900,
      minQuantity: 5,
      badge: null,
      isPerishable: false,
      product: { id: 'product-1', name: 'Помидоры', unit: '1 кг' },
      organization: { id: 'org-1', name: 'Опт-Юг' },
    });
    prisma.memberships.set('m-1', {
      userId: 'user-1',
      organizationId: 'org-1',
      role: 'WHOLESALE_SELLER',
    });
  });

  // -------------------------------------------------------------------
  // Склады
  // -------------------------------------------------------------------

  it('создание организации (onboarding) создаёт default-склад', async () => {
    // ensureDefaultLocation вызывается OrganizationsService.create;
    // здесь — прямой вызов контракта через сервис склада: пустой
    // список до, «Основной склад» после ленивой инициализации.
    expect(await service.listLocations(SELLER)).toHaveLength(0);
    // Первое движение без locationId создаёт default-склад.
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 100,
      reason: 'Первая поставка',
    });
    const locations = await service.listLocations(SELLER);
    expect(locations).toHaveLength(1);
    expect(locations[0]).toMatchObject({
      name: 'Основной склад',
      type: 'WAREHOUSE',
      isDefault: true,
    });
  });

  it('создание склада; isDefault единственный', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 100,
      reason: 'Первая поставка',
    });
    const second = await service.createLocation(SELLER, {
      name: 'Точка на Садовой',
      type: 'STORE',
      address: 'ул. Садовая, 12',
      isDefault: true,
    });
    expect(second.isDefault).toBe(true);
    const locations = await service.listLocations(SELLER);
    expect(locations.filter((l) => l.isDefault)).toHaveLength(1);
    expect(locations.map((l) => l.name)).toContain('Точка на Садовой');
  });

  it('переключение isDefault при обновлении — единственный дефолт', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 10,
      reason: 'Закупка',
    });
    const store = await service.createLocation(SELLER, {
      name: 'Новая точка',
      type: 'STORE',
    });
    await service.updateLocation(SELLER, store.id, { isDefault: true });
    const locations = await service.listLocations(SELLER);
    const defaults = locations.filter((l) => l.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].name).toBe('Новая точка');
  });

  it('обновление склада: имя и адрес', async () => {
    const created = await service.createLocation(SELLER, {
      name: 'Склад А',
      type: 'WAREHOUSE',
    });
    const updated = await service.updateLocation(SELLER, created.id, {
      name: 'Склад Б',
      address: 'ул. Новая, 1',
    });
    expect(updated.name).toBe('Склад Б');
    expect(updated.address).toBe('ул. Новая, 1');
  });

  it('удаление склада: запрещено при наличии движений', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 100,
      reason: 'Первая поставка',
    });
    const locations = await service.listLocations(SELLER);
    await expect(
      service.deleteLocation(SELLER, locations[0].id),
    ).rejects.toMatchObject({
      response: { code: 'STOCK_LOCATION_HAS_MOVEMENTS' },
    });
  });

  it('удаление пустого склада — ок', async () => {
    const created = await service.createLocation(SELLER, {
      name: 'Пустой склад',
      type: 'OTHER',
    });
    const result = await service.deleteLocation(SELLER, created.id);
    expect(result).toEqual({ deleted: true });
  });

  it('чужой склад — 404 (без раскрытия)', async () => {
    const alien = [...prisma.stockLocations.values()][0];
    void alien;
    const createdInOther = {
      id: 'loc-alien',
      organizationId: OTHER_ORG,
      name: 'Чужой',
      type: 'WAREHOUSE',
      address: null,
      isDefault: false,
      createdAt: new Date(),
    };
    prisma.stockLocations.set(createdInOther.id, createdInOther);
    await expect(
      service.updateLocation(SELLER, 'loc-alien', { name: 'Взлом' }),
    ).rejects.toThrow(NotFoundException);
    await expect(service.deleteLocation(SELLER, 'loc-alien')).rejects.toThrow(
      NotFoundException,
    );
  });

  // -------------------------------------------------------------------
  // Движения
  // -------------------------------------------------------------------

  it('RECEIPT: приход увеличивает остаток, движение в журнале', async () => {
    const result = await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 100,
      reason: 'Закупка у Ивана',
    });
    expect(result.balance.physicalQty).toBe(100);
    expect(result.balance.availableQty).toBe(100);
    expect(result.totals.availableQty).toBe(100);
    const movements = await service.listMovements(SELLER, {});
    expect(movements.items).toHaveLength(1);
    expect(movements.items[0]).toMatchObject({
      type: 'RECEIPT',
      quantityDelta: 100,
      reason: 'Закупка у Ивана',
      offerTitle: 'Помидоры',
    });
  });

  it('WRITE_OFF: списание уменьшает остаток + уведомление', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 100,
      reason: 'Закупка',
    });
    const result = await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'WRITE_OFF',
      quantity: 30,
      reason: 'Порча при перевозке',
    });
    expect(result.balance.physicalQty).toBe(70);
    expect(result.totals.availableQty).toBe(70);
    // Уведомление продавцам: списание.
    expect(prisma.notifications).toHaveLength(1);
    expect(prisma.notifications[0].type).toBe('STOCK_WRITE_OFF');
    expect(prisma.notifications[0].body).toContain('30');
  });

  it('WRITE_OFF сверх остатка — OUT_OF_STOCK, минус невозможен', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 10,
      reason: 'Закупка',
    });
    await expect(
      service.createMovement(SELLER, {
        offerId: 'offer-1',
        type: 'WRITE_OFF',
        quantity: 11,
        reason: 'Порча',
      }),
    ).rejects.toMatchObject({ response: { code: 'OUT_OF_STOCK' } });
    expect(prisma.availableOf('offer-1')).toBe(10);
  });

  it('ADJUSTMENT: корректировка может увести в минус (недостача)', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 10,
      reason: 'Закупка',
    });
    const result = await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'ADJUSTMENT',
      quantity: -15,
      reason: 'Инвентаризация: недостача',
    });
    expect(result.balance.physicalQty).toBe(-5);
    expect(result.balance.availableQty).toBe(-5);
  });

  it('валидация: quantity и reason', async () => {
    await expect(
      service.createMovement(SELLER, {
        offerId: 'offer-1',
        type: 'RECEIPT',
        quantity: 0,
        reason: 'Нулевое количество',
      }),
    ).rejects.toMatchObject({ response: { code: 'STOCK_INVALID_QUANTITY' } });
    await expect(
      service.createMovement(SELLER, {
        offerId: 'offer-1',
        type: 'RECEIPT',
        quantity: 5,
        reason: 'ок',
      }),
    ).rejects.toMatchObject({ response: { code: 'STOCK_REASON_REQUIRED' } });
  });

  it('чужой оффер — 404', async () => {
    prisma.offers.set('offer-alien', {
      id: 'offer-alien',
      productId: 'product-1',
      organizationId: OTHER_ORG,
      priceKopecks: 1000,
      minQuantity: 1,
      badge: null,
      isPerishable: false,
      product: { id: 'product-1', name: 'Чужое', unit: '1 кг' },
      organization: { id: 'org-2', name: 'Чужие' },
    });
    await expect(
      service.createMovement(SELLER, {
        offerId: 'offer-alien',
        type: 'RECEIPT',
        quantity: 5,
        reason: 'Взлом',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  // -------------------------------------------------------------------
  // Перемещение
  // -------------------------------------------------------------------

  it('transfer: пара TRANSFER_OUT + TRANSFER_IN, атомарно', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 100,
      reason: 'Закупка',
    });
    const warehouse = (await service.listLocations(SELLER))[0];
    const store = await service.createLocation(SELLER, {
      name: 'Точка на Садовой',
      type: 'STORE',
    });

    const result = await service.transfer(SELLER, {
      offerId: 'offer-1',
      fromLocationId: warehouse.id,
      toLocationId: store.id,
      quantity: 40,
      reason: 'Развоз по точкам',
    });
    expect(result.items).toHaveLength(2);
    const byLocation = new Map(result.items.map((b) => [b.locationId, b]));
    expect(byLocation.get(warehouse.id)?.availableQty).toBe(60);
    expect(byLocation.get(store.id)?.availableQty).toBe(40);

    // Журнал: пара движений перемещения.
    const types = [...prisma.stockMovements.values()]
      .filter((m) => m.type.startsWith('TRANSFER'))
      .map((m) => m.type)
      .sort();
    expect(types).toEqual(['TRANSFER_IN', 'TRANSFER_OUT']);
    // Суммарный остаток не изменился.
    expect(prisma.availableOf('offer-1')).toBe(100);
  });

  it('transfer: те же склады и нехватка — отклон', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 10,
      reason: 'Закупка',
    });
    const warehouse = (await service.listLocations(SELLER))[0];
    const store = await service.createLocation(SELLER, {
      name: 'Точка',
      type: 'STORE',
    });
    await expect(
      service.transfer(SELLER, {
        offerId: 'offer-1',
        fromLocationId: warehouse.id,
        toLocationId: warehouse.id,
        quantity: 5,
        reason: 'Туда же',
      }),
    ).rejects.toMatchObject({ response: { code: 'STOCK_SAME_LOCATION' } });
    await expect(
      service.transfer(SELLER, {
        offerId: 'offer-1',
        fromLocationId: warehouse.id,
        toLocationId: store.id,
        quantity: 11,
        reason: 'Больше нет',
      }),
    ).rejects.toMatchObject({ response: { code: 'OUT_OF_STOCK' } });
    // Ничего не списано (откат транзакции фейка).
    expect(prisma.availableOf('offer-1')).toBe(10);
    expect([...prisma.stockMovements.values()]).toHaveLength(1);
  });

  // -------------------------------------------------------------------
  // Остатки и сводка
  // -------------------------------------------------------------------

  it('balances и summary: агрегаты по складам', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 100,
      reason: 'Закупка',
    });
    const warehouse = (await service.listLocations(SELLER))[0];
    const store = await service.createLocation(SELLER, {
      name: 'Точка',
      type: 'STORE',
    });
    await service.transfer(SELLER, {
      offerId: 'offer-1',
      fromLocationId: warehouse.id,
      toLocationId: store.id,
      quantity: 40,
      reason: 'Развоз',
    });

    const balances = await service.listBalances(SELLER, {});
    expect(balances.items).toHaveLength(2);
    expect(balances.total).toBe(2);

    const one = await service.getBalance(SELLER, 'offer-1', store.id);
    expect(one.availableQty).toBe(40);
    expect(one.locationName).toBe('Точка');

    const summary = await service.summary(SELLER, 'offer-1');
    expect(summary).toMatchObject({
      offerId: 'offer-1',
      physicalQty: 100,
      reservedQty: 0,
      availableQty: 100,
      locationsCount: 2,
    });
  });

  it('уведомление «товар закончился» при обнулении', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 10,
      reason: 'Закупка',
    });
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'WRITE_OFF',
      quantity: 10,
      reason: 'Распродано всё',
    });
    const types = prisma.notifications.map((n) => n.type);
    expect(types).toContain('STOCK_EMPTY');
  });

  // -------------------------------------------------------------------
  // Фильтры и границы (дополнительные)
  // -------------------------------------------------------------------

  it('движение с явным locationId — на указанный склад', async () => {
    const store = await service.createLocation(SELLER, {
      name: 'Точка',
      type: 'STORE',
    });
    const result = await service.createMovement(SELLER, {
      offerId: 'offer-1',
      locationId: store.id,
      type: 'RECEIPT',
      quantity: 25,
      reason: 'Поставка сразу в точку',
    });
    expect(result.balance.locationId).toBe(store.id);
    expect(result.totals.availableQty).toBe(25);
  });

  it('приход на новый склад создаёт баланс (upsert)', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 100,
      reason: 'Закупка',
    });
    const store = await service.createLocation(SELLER, {
      name: 'Новая точка',
      type: 'STORE',
    });
    // TRANSFER_IN на склад без баланса — upsert новой строки.
    const result = await service.transfer(SELLER, {
      offerId: 'offer-1',
      fromLocationId: (await service.listLocations(SELLER))[0].id,
      toLocationId: store.id,
      quantity: 10,
      reason: 'Пробная партия',
    });
    const onStore = result.items.find((b) => b.locationId === store.id);
    expect(onStore?.availableQty).toBe(10);
  });

  it('списание без остатка — OUT_OF_STOCK (строки баланса нет)', async () => {
    await expect(
      service.createMovement(SELLER, {
        offerId: 'offer-1',
        type: 'WRITE_OFF',
        quantity: 1,
        reason: 'Нечего списывать',
      }),
    ).rejects.toMatchObject({ response: { code: 'OUT_OF_STOCK' } });
  });

  it('WRITE_OFF с остатком выше нуля — STOCK_EMPTY не приходит', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 10,
      reason: 'Закупка',
    });
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'WRITE_OFF',
      quantity: 3,
      reason: 'Частичная порча',
    });
    const types = prisma.notifications.map((n) => n.type);
    expect(types).toContain('STOCK_WRITE_OFF');
    expect(types).not.toContain('STOCK_EMPTY');
  });

  it('журнал: фильтры по offerId и locationId', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 100,
      reason: 'Закупка',
    });
    const store = await service.createLocation(SELLER, {
      name: 'Точка',
      type: 'STORE',
    });
    await service.transfer(SELLER, {
      offerId: 'offer-1',
      fromLocationId: (await service.listLocations(SELLER))[0].id,
      toLocationId: store.id,
      quantity: 30,
      reason: 'Развоз',
    });

    const byLocation = await service.listMovements(SELLER, {
      locationId: store.id,
    });
    expect(byLocation.total).toBe(1);
    expect(byLocation.items[0].type).toBe('TRANSFER_IN');

    const byOffer = await service.listMovements(SELLER, {
      offerId: 'offer-1',
    });
    expect(byOffer.total).toBe(3);
  });

  it('журнал: пагинация и hasMore', async () => {
    for (let i = 1; i <= 5; i += 1) {
      await service.createMovement(SELLER, {
        offerId: 'offer-1',
        type: 'RECEIPT',
        quantity: i,
        reason: `Поставка №${i}`,
      });
    }
    const first = await service.listMovements(SELLER, {
      page: 1,
      pageSize: 2,
    });
    expect(first.items).toHaveLength(2);
    expect(first.total).toBe(5);
    expect(first.hasMore).toBe(true);
    const last = await service.listMovements(SELLER, {
      page: 3,
      pageSize: 2,
    });
    expect(last.items).toHaveLength(1);
    expect(last.hasMore).toBe(false);
  });

  it('остатки: фильтр по складу', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 100,
      reason: 'Закупка',
    });
    const store = await service.createLocation(SELLER, {
      name: 'Точка',
      type: 'STORE',
    });
    await service.transfer(SELLER, {
      offerId: 'offer-1',
      fromLocationId: (await service.listLocations(SELLER))[0].id,
      toLocationId: store.id,
      quantity: 30,
      reason: 'Развоз',
    });
    const onlyStore = await service.listBalances(SELLER, {
      locationId: store.id,
    });
    expect(onlyStore.total).toBe(1);
    expect(onlyStore.items[0].availableQty).toBe(30);
  });

  it('несуществующий остаток — 404', async () => {
    const store = await service.createLocation(SELLER, {
      name: 'Пустой склад',
      type: 'WAREHOUSE',
    });
    await expect(
      service.getBalance(SELLER, 'offer-1', store.id),
    ).rejects.toThrow(NotFoundException);
  });

  it('summary несуществующего оффера — 404', async () => {
    await expect(service.summary(SELLER, 'no-such-offer')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('summary чужого оффера — 404', async () => {
    prisma.offers.set('offer-alien', {
      id: 'offer-alien',
      productId: 'product-1',
      organizationId: OTHER_ORG,
      priceKopecks: 1000,
      minQuantity: 1,
      badge: null,
      isPerishable: false,
      product: { id: 'product-1', name: 'Чужое', unit: '1 кг' },
      organization: { id: 'org-2', name: 'Чужие' },
    });
    await expect(service.summary(SELLER, 'offer-alien')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('transfer с чужим складом — 404', async () => {
    await service.createMovement(SELLER, {
      offerId: 'offer-1',
      type: 'RECEIPT',
      quantity: 100,
      reason: 'Закупка',
    });
    const warehouse = (await service.listLocations(SELLER))[0];
    const alien = {
      id: 'loc-alien',
      organizationId: OTHER_ORG,
      name: 'Чужой склад',
      type: 'WAREHOUSE',
      address: null,
      isDefault: false,
      createdAt: new Date(),
    };
    prisma.stockLocations.set(alien.id, alien);
    await expect(
      service.transfer(SELLER, {
        offerId: 'offer-1',
        fromLocationId: warehouse.id,
        toLocationId: 'loc-alien',
        quantity: 10,
        reason: 'Вывоз на чужой склад',
      }),
    ).rejects.toThrow(NotFoundException);
    // Ничего не списано.
    expect(prisma.availableOf('offer-1')).toBe(100);
  });
});
