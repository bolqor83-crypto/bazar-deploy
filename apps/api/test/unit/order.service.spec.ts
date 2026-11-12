/**
 * Unit-тесты OrderService (Промт 9, Часть E): группировка по
 * продавцу, нумерация BZ-YYYY-NNNNNN, stock-резерв с откатом
 * (снапшот-эмуляция транзакции фейка), отмена с восстановлением.
 */
import { BadRequestException } from '@nestjs/common';
import { OrderService } from '../../src/orders/order.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { FakeCartPrisma } from './fake-cart-prisma';

describe('OrderService (unit)', () => {
  let service: OrderService;
  let prisma: FakeCartPrisma;

  const BUYER = 'user-1';
  const OTHER = 'user-2';

  beforeEach(() => {
    prisma = new FakeCartPrisma();
    service = new OrderService(prisma as unknown as PrismaService);

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
    prisma.offers.set('offer-b', {
      id: 'offer-b',
      productId: 'product-2',
      organizationId: 'org-b',
      priceKopecks: 10400,
      stock: 30,
      minQuantity: 1,
      badge: null,
      isPerishable: false,
      product: { id: 'product-2', name: 'Огурцы', unit: '1 кг' },
      organization: { id: 'org-b', name: 'Сеть «У дома»' },
    });
  });

  const input = (items: { offerId: string; quantity: number }[]) => ({
    buyerId: BUYER,
    organizationId: null,
    items,
    deliveryMethod: 'pickup' as const,
  });

  it('создание: номер, итог, событие CREATED, резерв stock', async () => {
    const orders = await service.create(
      input([{ offerId: 'offer-a', quantity: 10 }]),
    );
    expect(orders).toHaveLength(1);
    expect(orders[0].number).toMatch(/^BZ-\d{4}-\d{6}$/);
    expect(orders[0].number.endsWith('-000001')).toBe(true);
    expect(orders[0].status).toBe('PENDING');
    expect(orders[0].subtotal).toBe(189000);
    expect(orders[0].events[0].type).toBe('CREATED');
    expect(orders[0].seller.name).toBe('Опт-Юг');
    expect(orders[0].items[0].title).toBe('Помидоры');
    expect(prisma.offers.get('offer-a')?.stock).toBe(40);
  });

  it('группировка: два продавца → два заказа, номера последовательны', async () => {
    const orders = await service.create(
      input([
        { offerId: 'offer-a', quantity: 5 },
        { offerId: 'offer-b', quantity: 3 },
      ]),
    );
    expect(orders).toHaveLength(2);
    const sellers = orders.map((o) => o.seller.name).sort();
    expect(sellers).toEqual(['Опт-Юг', 'Сеть «У дома»']);
    const numbers = orders.map((o) => o.number).sort();
    expect(numbers[0].endsWith('-000001')).toBe(true);
    expect(numbers[1].endsWith('-000002')).toBe(true);
    expect(prisma.offers.get('offer-a')?.stock).toBe(45);
    expect(prisma.offers.get('offer-b')?.stock).toBe(27);
  });

  it('ниже минимальной партии — отказ без резерва', async () => {
    await expect(
      service.create(input([{ offerId: 'offer-a', quantity: 2 }])),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.offers.get('offer-a')?.stock).toBe(50);
  });

  it('нехватка stock — откат всей группы (оба склада целы)', async () => {
    await expect(
      service.create(
        input([
          { offerId: 'offer-a', quantity: 10 },
          { offerId: 'offer-b', quantity: 40 },
        ]),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.offers.get('offer-a')?.stock).toBe(50);
    expect(prisma.offers.get('offer-b')?.stock).toBe(30);
    expect(prisma.orders.size).toBe(0);
    expect(prisma.orderCounters.get(new Date().getFullYear())?.seq ?? 0).toBe(
      0,
    );
  });

  it('список: только заказы покупателя', async () => {
    await service.create(input([{ offerId: 'offer-a', quantity: 5 }]));
    const mine = await service.list(BUYER, {});
    expect(mine.total).toBe(1);
    const other = await service.list(OTHER, {});
    expect(other.total).toBe(0);
  });

  it('деталь: покупатель видит, чужой — 404', async () => {
    const [order] = await service.create(
      input([{ offerId: 'offer-a', quantity: 5 }]),
    );
    const mine = await service.detail(BUYER, order.id);
    expect(mine.id).toBe(order.id);
    await expect(service.detail(OTHER, order.id)).rejects.toThrow();
  });

  it('отмена: статус, событие, восстановление stock', async () => {
    const [order] = await service.create(
      input([{ offerId: 'offer-a', quantity: 10 }]),
    );
    expect(prisma.offers.get('offer-a')?.stock).toBe(40);
    const cancelled = await service.cancel(BUYER, order.id);
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.events.at(-1)?.type).toBe('CANCELLED');
    expect(prisma.offers.get('offer-a')?.stock).toBe(50);
  });

  it('повторная отмена — NOT_CANCELLABLE', async () => {
    const [order] = await service.create(
      input([{ offerId: 'offer-a', quantity: 5 }]),
    );
    await service.cancel(BUYER, order.id);
    await expect(service.cancel(BUYER, order.id)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('seller (членство) может отменить', async () => {
    const [order] = await service.create(
      input([{ offerId: 'offer-a', quantity: 5 }]),
    );
    prisma.memberships.set('m-1', { userId: OTHER, organizationId: 'org-a' });
    const cancelled = await service.cancel(OTHER, order.id);
    expect(cancelled.status).toBe('CANCELLED');
  });

  it('снапшот цен: имя и цена фиксируются в позициях', async () => {
    const [order] = await service.create(
      input([{ offerId: 'offer-a', quantity: 5 }]),
    );
    // Каталог меняется после заказа...
    prisma.offers.get('offer-a')!.priceKopecks = 99999;
    prisma.offers.get('offer-a')!.product.name = 'Другое название';
    // ...но позиции заказа нетронуты.
    const detail = await service.detail(BUYER, order.id);
    expect(detail.items[0].price).toBe(18900);
    expect(detail.items[0].title).toBe('Помидоры');
  });
});
