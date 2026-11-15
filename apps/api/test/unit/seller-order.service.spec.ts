/**
 * Unit-тесты SellerOrderService (Промт 10, Часть C): статусная
 * машина confirm→preparing→ready→complete, отмена с возвратом
 * остатков (Промт 11: UNRESERVED/RETURN_IN по движениям заказа),
 * некорректные переходы, список с фильтрами, уведомления
 * покупателю. Полные сценарии (guard, JWT) — e2e.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SellerOrderService } from '../../src/seller/seller-order.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { FakeCartPrisma } from './fake-cart-prisma';

describe('SellerOrderService (unit)', () => {
  let service: SellerOrderService;
  let prisma: FakeCartPrisma;

  const SELLER = { userId: 'user-seller', organizationId: 'org-a' };
  const BUYER = 'user-buyer';

  beforeEach(() => {
    prisma = new FakeCartPrisma();
    service = new SellerOrderService(prisma as unknown as PrismaService);

    prisma.offers.set('offer-a', {
      id: 'offer-a',
      productId: 'product-1',
      organizationId: 'org-a',
      priceKopecks: 18900,
      minQuantity: 5,
      badge: null,
      isPerishable: false,
      product: { id: 'product-1', name: 'Помидоры', unit: '1 кг' },
      organization: { id: 'org-a', name: 'Опт-Юг' },
    });
    // Промт 11: остаток 50, из них 10 — резерв заказа order-1
    // (движение RESERVED, как создаёт OrderService).
    prisma.seedStock('offer-a', 'org-a', 50);
    const balance = [...prisma.stockBalances.values()].find(
      (b) => b.offerId === 'offer-a',
    );
    if (balance) {
      balance.reservedQty = 10;
      balance.availableQty = 40;
      const movementId = 'movement-reserved-1';
      prisma.stockMovements.set(movementId, {
        id: movementId,
        offerId: 'offer-a',
        locationId: balance.locationId,
        type: 'RESERVED',
        quantityDelta: -10,
        reason: 'Резерв заказа BZ-2026-000001',
        actorId: BUYER,
        refType: 'order',
        refId: 'order-1',
        createdAt: new Date('2026-11-13T08:00:01Z'),
      });
    }

    prisma.orders.set('order-1', {
      id: 'order-1',
      number: 'BZ-2026-000001',
      buyerId: BUYER,
      sellerId: 'org-a',
      organizationId: null,
      status: 'PENDING',
      subtotal: 189000,
      deliveryCost: 0,
      total: 189000,
      address: null,
      comment: null,
      createdAt: new Date('2026-11-13T08:00:00Z'),
      updatedAt: new Date('2026-11-13T08:00:00Z'),
      seller: { id: 'org-a', name: 'Опт-Юг' },
      buyer: { id: BUYER, name: 'Мария Петрова', phone: '+79000000001' },
      items: [
        {
          id: 'item-1',
          orderId: 'order-1',
          offerId: 'offer-a',
          title: 'Помидоры',
          unit: '1 кг',
          price: 18900,
          quantity: 10,
          total: 189000,
        },
      ],
      events: [
        {
          id: 'event-1',
          orderId: 'order-1',
          type: 'CREATED',
          actorId: BUYER,
          payload: null,
          createdAt: new Date('2026-11-13T08:00:00Z'),
        },
      ],
      deliveries: [],
    });
  });

  // -----------------------------------------------------------------
  // Список
  // -----------------------------------------------------------------

  it('список: только заказы своей организации', async () => {
    prisma.orders.set('order-2', {
      ...prisma.orders.get('order-1')!,
      id: 'order-2',
      sellerId: 'org-b',
      seller: { id: 'org-b', name: 'Чужой' },
    });
    const result = await service.list(SELLER, {});
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe('order-1');
    expect(result.items[0].buyer.name).toBe('Мария Петрова');
    expect(result.items[0].buyer.phone).toBe('+79000000001');
  });

  it('список: фильтр по нескольким статусам (CONFIRMED,PREPARING)', async () => {
    prisma.orders.set('order-c', {
      ...prisma.orders.get('order-1')!,
      id: 'order-c',
      number: 'BZ-2026-000002',
      status: 'CONFIRMED',
    });
    prisma.orders.set('order-p', {
      ...prisma.orders.get('order-1')!,
      id: 'order-p',
      number: 'BZ-2026-000003',
      status: 'PREPARING',
    });
    const result = await service.list(SELLER, {
      statuses: ['CONFIRMED', 'PREPARING'],
    });
    expect(result.total).toBe(2);
    expect(result.items.map((o) => o.status).sort()).toEqual([
      'CONFIRMED',
      'PREPARING',
    ]);
  });

  it('список: поиск по номеру без учёта регистра', async () => {
    const result = await service.list(SELLER, { search: 'bz-2026-0000' });
    expect(result.total).toBe(1);
    const none = await service.list(SELLER, { search: 'нет-такого' });
    expect(none.total).toBe(0);
  });

  it('список: поиск по имени покупателя', async () => {
    const result = await service.list(SELLER, { search: 'мария' });
    expect(result.total).toBe(1);
  });

  // -----------------------------------------------------------------
  // Детали
  // -----------------------------------------------------------------

  it('детали: заказ своей организации с событиями', async () => {
    const order = await service.detail(SELLER, 'order-1');
    expect(order.number).toBe('BZ-2026-000001');
    expect(order.events[0].type).toBe('CREATED');
  });

  it('детали: чужой заказ — 404', async () => {
    await expect(service.detail(SELLER, 'nope')).rejects.toThrow(
      NotFoundException,
    );
  });

  // -----------------------------------------------------------------
  // Переходы
  // -----------------------------------------------------------------

  it('confirm: PENDING→CONFIRMED + событие + уведомление + SALE_OUT', async () => {
    const order = await service.act(SELLER, 'order-1', 'confirm');
    expect(order.status).toBe('CONFIRMED');
    expect(order.events.map((e) => e.type)).toContain('CONFIRMED');
    expect(prisma.notifications).toHaveLength(1);
    expect(prisma.notifications[0].userId).toBe(BUYER);
    expect(prisma.notifications[0].type).toBe('ORDER_STATUS');
    expect(prisma.notifications[0].title).toContain('BZ-2026-000001');
    expect(prisma.notifications[0].title).toContain('подтверждён');

    // Промт 11: SALE_OUT списал физический остаток, резерв снят.
    const balance = [...prisma.stockBalances.values()].find(
      (b) => b.offerId === 'offer-a',
    );
    expect(balance?.physicalQty).toBe(40);
    expect(balance?.reservedQty).toBe(0);
    expect(balance?.availableQty).toBe(40);
    const types = [...prisma.stockMovements.values()]
      .filter((m) => m.refId === 'order-1')
      .map((m) => m.type);
    expect(types).toContain('SALE_OUT');
    expect(types).toContain('UNRESERVED');
  });

  it('полный цикл: confirm→preparing→ready→complete', async () => {
    await service.act(SELLER, 'order-1', 'confirm');
    await service.act(SELLER, 'order-1', 'preparing');
    await service.act(SELLER, 'order-1', 'ready');
    const done = await service.act(SELLER, 'order-1', 'complete');
    expect(done.status).toBe('COMPLETED');
    expect(prisma.notifications).toHaveLength(4);
    const types = prisma.notifications.map((n) => n.type);
    expect(types).toEqual([
      'ORDER_STATUS',
      'ORDER_STATUS',
      'ORDER_STATUS',
      'ORDER_STATUS',
    ]);
    // Промт 11: доступность после продажи — 40 (резерв конвертирован).
    expect(prisma.availableOf('offer-a')).toBe(40);
  });

  it('пропуск шага запрещён: PENDING→preparing — INVALID_TRANSITION', async () => {
    await expect(service.act(SELLER, 'order-1', 'preparing')).rejects.toThrow(
      BadRequestException,
    );
    try {
      await service.act(SELLER, 'order-1', 'preparing');
    } catch (error) {
      const bad = error as BadRequestException;
      expect(bad.getResponse()).toMatchObject({ code: 'INVALID_TRANSITION' });
    }
    expect(prisma.orders.get('order-1')?.status).toBe('PENDING');
    expect(prisma.notifications).toHaveLength(0);
  });

  it('complete из CONFIRMED запрещён', async () => {
    await service.act(SELLER, 'order-1', 'confirm');
    await expect(service.act(SELLER, 'order-1', 'complete')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('отмена из PENDING: возврат резерва + уведомление ORDER_CANCELLED', async () => {
    const order = await service.act(SELLER, 'order-1', 'cancel');
    expect(order.status).toBe('CANCELLED');
    // Промт 11: резерв снят (UNRESERVED) — доступность восстановлена.
    expect(prisma.availableOf('offer-a')).toBe(50);
    const balance = [...prisma.stockBalances.values()].find(
      (b) => b.offerId === 'offer-a',
    );
    expect(balance?.reservedQty).toBe(0);
    expect(balance?.physicalQty).toBe(50);
    expect(prisma.notifications).toHaveLength(1);
    expect(prisma.notifications[0].type).toBe('ORDER_CANCELLED');
    expect(prisma.notifications[0].title).toContain('отменён продавцом');
  });

  it('отмена из CONFIRMED разрешена (RETURN_IN), из PREPARING — нет', async () => {
    await service.act(SELLER, 'order-1', 'confirm');
    const cancelled = await service.act(SELLER, 'order-1', 'cancel');
    expect(cancelled.status).toBe('CANCELLED');
    // Промт 11: проданный товар возвращён на склад (RETURN_IN).
    expect(prisma.availableOf('offer-a')).toBe(50);
    const balance = [...prisma.stockBalances.values()].find(
      (b) => b.offerId === 'offer-a',
    );
    expect(balance?.physicalQty).toBe(50);

    prisma.orders.get('order-1')!.status = 'PREPARING';
    await expect(service.act(SELLER, 'order-1', 'cancel')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('действие по чужому заказу — 404', async () => {
    await expect(
      service.act(
        { userId: 'user-seller', organizationId: 'org-b' },
        'order-1',
        'confirm',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
