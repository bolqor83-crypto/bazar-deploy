/**
 * Unit-тесты SellerOrderService (Промт 10, Часть C): статусная
 * машина confirm→preparing→ready→complete, отмена с возвратом
 * stock, некорректные переходы, список с фильтрами, уведомления
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
      stock: 50,
      minQuantity: 5,
      badge: null,
      isPerishable: false,
      product: { id: 'product-1', name: 'Помидоры', unit: '1 кг' },
      organization: { id: 'org-a', name: 'Опт-Юг' },
    });

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

  it('confirm: PENDING→CONFIRMED + событие + уведомление покупателю', async () => {
    const order = await service.act(SELLER, 'order-1', 'confirm');
    expect(order.status).toBe('CONFIRMED');
    expect(order.events.map((e) => e.type)).toContain('CONFIRMED');
    expect(prisma.notifications).toHaveLength(1);
    expect(prisma.notifications[0].userId).toBe(BUYER);
    expect(prisma.notifications[0].type).toBe('ORDER_STATUS');
    expect(prisma.notifications[0].title).toContain('BZ-2026-000001');
    expect(prisma.notifications[0].title).toContain('подтверждён');
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
    expect(prisma.offers.get('offer-a')?.stock).toBe(50);
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

  it('отмена из PENDING: stock назад + уведомление ORDER_CANCELLED', async () => {
    const order = await service.act(SELLER, 'order-1', 'cancel');
    expect(order.status).toBe('CANCELLED');
    expect(prisma.offers.get('offer-a')?.stock).toBe(60);
    expect(prisma.notifications).toHaveLength(1);
    expect(prisma.notifications[0].type).toBe('ORDER_CANCELLED');
    expect(prisma.notifications[0].title).toContain('отменён продавцом');
  });

  it('отмена из CONFIRMED разрешена, из PREPARING — нет', async () => {
    await service.act(SELLER, 'order-1', 'confirm');
    const cancelled = await service.act(SELLER, 'order-1', 'cancel');
    expect(cancelled.status).toBe('CANCELLED');

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
