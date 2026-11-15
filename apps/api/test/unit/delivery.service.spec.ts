/**
 * Unit-тесты DeliveryService (Промт 10, Часть D): создание заявки
 * (buyer/seller, валидации), лента перевозчика (feed/mine),
 * принятие атомарно, ведение рейса picked-up → in-transit →
 * delivered, завершение покупателем, отмена по правилам ролей,
 * уведомления участникам. Guard/JWT — e2e.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeliveryService } from '../../src/delivery/delivery.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { FakeDeliveryPrisma } from './fake-delivery-prisma';

describe('DeliveryService (unit)', () => {
  let service: DeliveryService;
  let prisma: FakeDeliveryPrisma;

  const BUYER = 'user-buyer';
  const SELLER = 'user-seller';
  const CARRIER = 'user-carrier';
  const SELLER_ORG = 'org-seller';
  const CARRIER_ORG = 'org-carrier';
  const CARRIER_CONTEXT = { userId: CARRIER, organizationId: CARRIER_ORG };
  const OTHER_CARRIER_CONTEXT = {
    userId: 'user-other-carrier',
    organizationId: 'org-other-carrier',
  };

  beforeEach(() => {
    prisma = new FakeDeliveryPrisma();
    service = new DeliveryService(prisma as unknown as PrismaService);

    prisma.users.set(BUYER, { id: BUYER, name: 'Мария Петрова' });
    prisma.users.set(SELLER, { id: SELLER, name: 'Пётр Селиванов' });
    prisma.users.set(CARRIER, { id: CARRIER, name: 'Иван Петров' });
    prisma.organizations.set(SELLER_ORG, {
      id: SELLER_ORG,
      name: 'Опт-Юг',
    });
    prisma.organizations.set(CARRIER_ORG, {
      id: CARRIER_ORG,
      name: 'Транс-Логистик',
    });
    prisma.memberships.set('m1', {
      userId: SELLER,
      organizationId: SELLER_ORG,
      role: 'WHOLESALE_SELLER',
    });
    prisma.memberships.set('m2', {
      userId: CARRIER,
      organizationId: CARRIER_ORG,
      role: 'CARRIER',
    });
    prisma.orders.set('order-1', {
      id: 'order-1',
      number: 'BZ-2026-000001',
      buyerId: BUYER,
      sellerId: SELLER_ORG,
      status: 'CONFIRMED',
      createdAt: new Date('2026-11-14T08:00:00Z'),
    });
  });

  /** Создать заявку от покупателя по order-1. */
  async function createFromBuyer(orderId = 'order-1') {
    return service.create({
      requesterId: BUYER,
      orderId,
      pickupAddress: 'База Опт-Юг, ул. Шоссейная, 4',
      pickupContact: 'Пётр, +79005550101',
      dropoffAddress: 'ул. Большая Садовая, 101',
      dropoffContact: 'Мария, +79005550202',
      weightKg: 120,
      volumeL: 800,
      cargoNotes: 'Помидоры в ящиках, хрупкое',
    });
  }

  // -----------------------------------------------------------------
  // Создание заявки
  // -----------------------------------------------------------------

  it('покупатель создаёт заявку по подтверждённому заказу', async () => {
    const delivery = await createFromBuyer();
    expect(delivery.status).toBe('PENDING');
    expect(delivery.number).toBe(`DL-${new Date().getFullYear()}-000001`);
    expect(delivery.orderNumber).toBe('BZ-2026-000001');
    expect(delivery.requesterName).toBe('Мария Петрова');
    expect(delivery.carrierName).toBeNull();
    expect(delivery.weightKg).toBe(120);
    expect(delivery.events.map((e) => e.type)).toEqual(['CREATED']);
  });

  it('создание покупателем уведомляет продавцов организации', async () => {
    await createFromBuyer();
    expect(prisma.notifications).toHaveLength(1);
    expect(prisma.notifications[0].type).toBe('NEW_DELIVERY');
    expect(prisma.notifications[0].userId).toBe(SELLER);
    const payload = JSON.parse(prisma.notifications[0].payload ?? '{}');
    expect(payload.deliveryNumber).toMatch(/^DL-\d{4}-\d{6}$/);
    expect(payload.orderNumber).toBe('BZ-2026-000001');
  });

  it('создание продавцом уведомляет покупателя', async () => {
    const delivery = await service.create({
      requesterId: SELLER,
      orderId: 'order-1',
      pickupAddress: 'База Опт-Юг, ул. Шоссейная, 4',
      pickupContact: 'Пётр, +79005550101',
      dropoffAddress: 'ул. Большая Садовая, 101',
      dropoffContact: 'Мария, +79005550202',
    });
    expect(delivery.requesterId).toBe(SELLER);
    expect(prisma.notifications).toHaveLength(1);
    expect(prisma.notifications[0].userId).toBe(BUYER);
  });

  it('чужой заказ — 404', async () => {
    await expect(
      service.create({
        requesterId: 'user-stranger',
        orderId: 'order-1',
        pickupAddress: 'а',
        pickupContact: 'к',
        dropoffAddress: 'б',
        dropoffContact: 'к',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('несуществующий заказ — 404', async () => {
    await expect(createFromBuyer('order-missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('неподтверждённый заказ — 400 DELIVERY_ORDER_NOT_READY', async () => {
    prisma.orders.get('order-1')!.status = 'PENDING';
    await expect(createFromBuyer()).rejects.toThrow(BadRequestException);
  });

  it('статусы PREPARING и READY тоже допускают заявку', async () => {
    prisma.orders.get('order-1')!.status = 'PREPARING';
    const preparing = await createFromBuyer();
    expect(preparing.status).toBe('PENDING');
    await service.cancel(BUYER, preparing.id, 'Отменим, создадим на READY');
    prisma.orders.get('order-1')!.status = 'READY';
    const ready = await createFromBuyer();
    expect(ready.status).toBe('PENDING');
  });

  it('завершённый заказ — 400', async () => {
    prisma.orders.get('order-1')!.status = 'COMPLETED';
    await expect(createFromBuyer()).rejects.toThrow(BadRequestException);
  });

  it('повторная активная заявка — 400 DELIVERY_ALREADY_EXISTS', async () => {
    await createFromBuyer();
    await expect(createFromBuyer()).rejects.toThrow(BadRequestException);
  });

  it('после отмены заявки можно создать новую', async () => {
    const delivery = await createFromBuyer();
    await service.cancel(BUYER, delivery.id, 'Передумали');
    const again = await createFromBuyer();
    expect(again.status).toBe('PENDING');
    expect(again.number).toBe(`DL-${new Date().getFullYear()}-000002`);
  });

  // -----------------------------------------------------------------
  // Лента перевозчика
  // -----------------------------------------------------------------

  it('feed: только свободные заявки (PENDING)', async () => {
    await createFromBuyer();
    const feed = await service.carrierList(CARRIER_CONTEXT, 'feed', {});
    expect(feed.total).toBe(1);
    expect(feed.items[0].status).toBe('PENDING');
    // После принятия — из ленты исчезает.
    await service.carrierAct(
      CARRIER_CONTEXT,
      feed.items[0].id,
      'accept',
      15000,
    );
    const after = await service.carrierList(CARRIER_CONTEXT, 'feed', {});
    expect(after.total).toBe(0);
  });

  it('mine: только заявки своей организации', async () => {
    await createFromBuyer();
    const feed = await service.carrierList(CARRIER_CONTEXT, 'feed', {});
    await service.carrierAct(CARRIER_CONTEXT, feed.items[0].id, 'accept');
    const mine = await service.carrierList(CARRIER_CONTEXT, 'mine', {});
    expect(mine.total).toBe(1);
    expect(mine.items[0].carrierName).toBe('Транс-Логистик');
    const other = await service.carrierList(OTHER_CARRIER_CONTEXT, 'mine', {});
    expect(other.total).toBe(0);
  });

  // -----------------------------------------------------------------
  // Принятие и ведение рейса
  // -----------------------------------------------------------------

  it('принятие: PENDING → ACCEPTED со ставкой и событием', async () => {
    const created = await createFromBuyer();
    const accepted = await service.carrierAct(
      CARRIER_CONTEXT,
      created.id,
      'accept',
      15000,
    );
    expect(accepted.status).toBe('ACCEPTED');
    expect(accepted.price).toBe(15000);
    expect(accepted.carrierName).toBe('Транс-Логистик');
    expect(accepted.events.map((e) => e.type)).toEqual(['CREATED', 'ACCEPTED']);
    // Уведомления: создателю-продавцу на create, затем на принятие —
    // покупателю и продавцу (участники доставки).
    expect(prisma.notifications).toHaveLength(3);
    expect(prisma.notifications[1].type).toBe('DELIVERY_STATUS');
    expect(prisma.notifications[1].userId).toBe(BUYER);
    expect(prisma.notifications[1].title).toContain('принята перевозчиком');
    expect(prisma.notifications[2].userId).toBe(SELLER);
  });

  it('принятие без ставки: price остаётся null', async () => {
    const created = await createFromBuyer();
    const accepted = await service.carrierAct(
      CARRIER_CONTEXT,
      created.id,
      'accept',
    );
    expect(accepted.price).toBeNull();
  });

  it('заявку уже забрала другая организация — 404', async () => {
    const created = await createFromBuyer();
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'accept');
    await expect(
      service.carrierAct(OTHER_CARRIER_CONTEXT, created.id, 'accept'),
    ).rejects.toThrow(NotFoundException);
  });

  it('повторное принятие своей организацией — 400 ALREADY_ACCEPTED', async () => {
    const created = await createFromBuyer();
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'accept');
    await expect(
      service.carrierAct(CARRIER_CONTEXT, created.id, 'accept'),
    ).rejects.toThrow(BadRequestException);
  });

  it('полный цикл перевозчика: accepted → picked-up → in-transit → delivered', async () => {
    const created = await createFromBuyer();
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'accept', 15000);
    const picked = await service.carrierAct(
      CARRIER_CONTEXT,
      created.id,
      'picked-up',
    );
    expect(picked.status).toBe('PICKED_UP');
    const transit = await service.carrierAct(
      CARRIER_CONTEXT,
      created.id,
      'in-transit',
    );
    expect(transit.status).toBe('IN_TRANSIT');
    const delivered = await service.carrierAct(
      CARRIER_CONTEXT,
      created.id,
      'delivered',
    );
    expect(delivered.status).toBe('DELIVERED');
    expect(delivered.events.map((e) => e.type)).toEqual([
      'CREATED',
      'ACCEPTED',
      'PICKED_UP',
      'IN_TRANSIT',
      'DELIVERED',
    ]);
    // По событию на переход + уведомления покупателю и продавцам.
    expect(prisma.notifications).toHaveLength(9);
  });

  it('пропуск шага — 400 INVALID_TRANSITION', async () => {
    const created = await createFromBuyer();
    await expect(
      service.carrierAct(CARRIER_CONTEXT, created.id, 'in-transit'),
    ).rejects.toThrow(BadRequestException);
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'accept');
    await expect(
      service.carrierAct(CARRIER_CONTEXT, created.id, 'delivered'),
    ).rejects.toThrow(BadRequestException);
  });

  it('чужая организация не ведёт рейс — 404', async () => {
    const created = await createFromBuyer();
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'accept');
    await expect(
      service.carrierAct(OTHER_CARRIER_CONTEXT, created.id, 'picked-up'),
    ).rejects.toThrow(NotFoundException);
  });

  // -----------------------------------------------------------------
  // Завершение покупателем
  // -----------------------------------------------------------------

  it('завершение: покупатель подтверждает DELIVERED → COMPLETED', async () => {
    const created = await createFromBuyer();
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'accept', 15000);
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'picked-up');
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'in-transit');
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'delivered');
    const completed = await service.complete(BUYER, created.id);
    expect(completed.status).toBe('COMPLETED');
    expect(completed.events.map((e) => e.type)).toContain('COMPLETED');
    // Уведомление перевозчику о завершении.
    const last = prisma.notifications[prisma.notifications.length - 1];
    expect(last.type).toBe('DELIVERY_STATUS');
    expect(last.userId).toBe(CARRIER);
  });

  it('завершение не покупателем — 404', async () => {
    const created = await createFromBuyer();
    await expect(service.complete(SELLER, created.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('завершение недоставленной заявки — 400', async () => {
    const created = await createFromBuyer();
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'accept');
    await expect(service.complete(BUYER, created.id)).rejects.toThrow(
      BadRequestException,
    );
  });

  // -----------------------------------------------------------------
  // Отмена
  // -----------------------------------------------------------------

  it('покупатель отменяет PENDING с причиной', async () => {
    const created = await createFromBuyer();
    const cancelled = await service.cancel(BUYER, created.id, 'Передумали');
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.events.map((e) => e.type)).toContain('CANCELLED');
  });

  it('покупатель не может отменить ACCEPTED — 400', async () => {
    const created = await createFromBuyer();
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'accept');
    await expect(service.cancel(BUYER, created.id, 'Не нужно')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('перевозчик отменяет ACCEPTED с причиной', async () => {
    const created = await createFromBuyer();
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'accept');
    const cancelled = await service.cancel(
      CARRIER,
      created.id,
      'Машина сломалась',
    );
    expect(cancelled.status).toBe('CANCELLED');
    expect(prisma.notifications[prisma.notifications.length - 1].type).toBe(
      'DELIVERY_CANCELLED',
    );
  });

  it('перевозчик не может отменить PICKED_UP — 400', async () => {
    const created = await createFromBuyer();
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'accept');
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'picked-up');
    await expect(
      service.cancel(CARRIER, created.id, 'Не везу'),
    ).rejects.toThrow(BadRequestException);
  });

  it('чужой пользователь не может отменить — 404', async () => {
    const created = await createFromBuyer();
    await expect(
      service.cancel('user-stranger', created.id, 'Зачем'),
    ).rejects.toThrow(NotFoundException);
  });

  // -----------------------------------------------------------------
  // Детали
  // -----------------------------------------------------------------

  it('детали: участник видит заявку, чужой — 404', async () => {
    const created = await createFromBuyer();
    const asBuyer = await service.detail(BUYER, created.id);
    expect(asBuyer.number).toBe(created.number);
    const asSeller = await service.detail(SELLER, created.id);
    expect(asSeller.id).toBe(created.id);
    await expect(service.detail(CARRIER, created.id)).rejects.toThrow(
      NotFoundException,
    );
    // После принятия перевозчик становится участником.
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'accept');
    const asCarrier = await service.detail(CARRIER, created.id);
    expect(asCarrier.status).toBe('ACCEPTED');
  });

  it('carrierDetail: PENDING доступна, чужая активная скрыта', async () => {
    const created = await createFromBuyer();
    const feed = await service.carrierDetail(CARRIER_CONTEXT, created.id);
    expect(feed.status).toBe('PENDING');
    await service.carrierAct(CARRIER_CONTEXT, created.id, 'accept');
    const mine = await service.carrierDetail(CARRIER_CONTEXT, created.id);
    expect(mine.status).toBe('ACCEPTED');
    await expect(
      service.carrierDetail(OTHER_CARRIER_CONTEXT, created.id),
    ).rejects.toThrow(NotFoundException);
  });
});
