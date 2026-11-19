/**
 * Unit-тесты OrderService (Промт 9, Часть E): группировка по
 * продавцу, нумерация BZ-YYYY-NNNNNN, резерв остатков с откатом
 * (снапшот-эмуляция транзакции фейка), отмена с восстановлением.
 *
 * Промт 11: резерв — event-sourced (RESERVED при создании,
 * UNRESERVED при отмене PENDING, RETURN_IN при отмене CONFIRMED),
 * баланс вместо ProductOffer.stock (ADR 0012).
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
      minQuantity: 1,
      badge: null,
      isPerishable: false,
      product: { id: 'product-2', name: 'Огурцы', unit: '1 кг' },
      organization: { id: 'org-b', name: 'Сеть «У дома»' },
    });
    // Промт 11: остатки — балансы (INITIAL-движения).
    prisma.seedStock('offer-a', 'org-a', 50);
    prisma.seedStock('offer-b', 'org-b', 30);
  });

  const input = (items: { offerId: string; quantity: number }[]) => ({
    buyerId: BUYER,
    organizationId: null,
    items,
    deliveryMethod: 'pickup' as const,
  });

  /** Баланс оффера (единственный склад в фикстурах). */
  const balanceOf = (offerId: string) =>
    [...prisma.stockBalances.values()].find((b) => b.offerId === offerId);

  it('создание: номер, итог, событие CREATED, резерв RESERVED', async () => {
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

    // Промт 11: резерв — движение RESERVED, reservedQty += 10,
    // физический остаток не тронут, доступность упала.
    const balance = balanceOf('offer-a');
    expect(balance?.reservedQty).toBe(10);
    expect(balance?.physicalQty).toBe(50);
    expect(balance?.availableQty).toBe(40);
    const reservedMovements = [...prisma.stockMovements.values()].filter(
      (m) => m.type === 'RESERVED' && m.refId === orders[0].id,
    );
    expect(reservedMovements).toHaveLength(1);
    expect(reservedMovements[0].quantityDelta).toBe(-10);
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
    expect(balanceOf('offer-a')?.availableQty).toBe(45);
    expect(balanceOf('offer-b')?.availableQty).toBe(27);
  });

  it('ниже минимальной партии — отказ без резерва', async () => {
    await expect(
      service.create(input([{ offerId: 'offer-a', quantity: 2 }])),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.availableOf('offer-a')).toBe(50);
  });

  it('нехватка остатка — откат всей группы (оба склада целы)', async () => {
    await expect(
      service.create(
        input([
          { offerId: 'offer-a', quantity: 10 },
          { offerId: 'offer-b', quantity: 40 },
        ]),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.availableOf('offer-a')).toBe(50);
    expect(prisma.availableOf('offer-b')).toBe(30);
    expect(prisma.orders.size).toBe(0);
    expect(prisma.orderCounters.get(new Date().getFullYear())?.seq ?? 0).toBe(
      0,
    );
    // Движений не появилось (откат).
    expect(prisma.stockMovements.size).toBe(2); // только INITIAL-фикстуры
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

  it('отмена PENDING: UNRESERVED, доступность восстановлена', async () => {
    const [order] = await service.create(
      input([{ offerId: 'offer-a', quantity: 10 }]),
    );
    expect(prisma.availableOf('offer-a')).toBe(40);
    const cancelled = await service.cancel(BUYER, order.id);
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.events.at(-1)?.type).toBe('CANCELLED');

    // Промт 11: резерв снят движением UNRESERVED.
    const balance = balanceOf('offer-a');
    expect(balance?.reservedQty).toBe(0);
    expect(balance?.physicalQty).toBe(50);
    expect(balance?.availableQty).toBe(50);
    const unreserved = [...prisma.stockMovements.values()].filter(
      (m) => m.type === 'UNRESERVED' && m.refId === order.id,
    );
    expect(unreserved).toHaveLength(1);
    expect(unreserved[0].quantityDelta).toBe(10);
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

  describe('Заказ по персональной цене (Промт 16, C)', () => {
    /** POR-оффер org-a + ANSWERED-запрос покупателя в корзине. */
    const seedQuote = (options?: {
      status?: 'PENDING' | 'ANSWERED' | 'DECLINED';
      validUntil?: Date;
    }) => {
      prisma.offers.set('offer-por', {
        id: 'offer-por',
        productId: 'product-3',
        organizationId: 'org-a',
        priceKopecks: 25000,
        priceOnRequest: true,
        minQuantity: 10,
        badge: null,
        isPerishable: false,
        product: { id: 'product-3', name: 'Картофель', unit: '1 кг' },
        organization: { id: 'org-a', name: 'Опт-Юг' },
      });
      prisma.seedStock('offer-por', 'org-a', 100);
      prisma.priceRequests.set('quote-1', {
        id: 'quote-1',
        buyerId: BUYER,
        offerId: 'offer-por',
        quantity: 20,
        message: null,
        status: options?.status ?? 'ANSWERED',
        quotedPriceKopecks: 22000,
        validUntil:
          options?.validUntil ?? new Date(Date.now() + 48 * 3_600_000),
        respondedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // Строка корзины покупателя по quote (как делает CartService).
      prisma.cartItems.set('cart-item-quote', {
        id: 'cart-item-quote',
        cartId: 'cart-quote',
        offerId: 'offer-por',
        quantity: 20,
        priceRequestId: 'quote-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        offer: prisma.offers.get('offer-por') as never,
      });
      prisma.carts.set('cart-quote', {
        id: 'cart-quote',
        userId: BUYER,
        organizationId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return 'quote-1';
    };

    it('цена позиции = quotedPriceKopecks, трассировка priceRequestId', async () => {
      seedQuote();
      const orders = await service.create({
        buyerId: BUYER,
        organizationId: null,
        items: [{ offerId: 'offer-por', quantity: 20 }],
        deliveryMethod: 'pickup',
      });
      expect(orders).toHaveLength(1);
      const item = orders[0].items[0];
      expect(item.price).toBe(22000);
      expect(item.total).toBe(22000 * 20);
      expect(item.priceRequestId).toBe('quote-1');
      expect(orders[0].subtotal).toBe(22000 * 20);
    });

    it('POR-оффер без quote — PRICE_REQUIRED (цена не покидает сервер)', async () => {
      seedQuote();
      // Убираем строку корзины с quote: прямой заказ без предложения.
      prisma.cartItems.delete('cart-item-quote');
      await expect(
        service.create({
          buyerId: BUYER,
          organizationId: null,
          items: [{ offerId: 'offer-por', quantity: 20 }],
          deliveryMethod: 'pickup',
        }),
      ).rejects.toMatchObject({ response: { code: 'PRICE_REQUIRED' } });
    });

    it('истёкший quote — QUOTE_EXPIRED', async () => {
      seedQuote({ validUntil: new Date(Date.now() - 1_000) });
      await expect(
        service.create({
          buyerId: BUYER,
          organizationId: null,
          items: [{ offerId: 'offer-por', quantity: 20 }],
          deliveryMethod: 'pickup',
        }),
      ).rejects.toMatchObject({ response: { code: 'QUOTE_EXPIRED' } });
    });

    it('PENDING-запрос в корзине — PRICE_REQUEST_NOT_ANSWERED', async () => {
      seedQuote({ status: 'PENDING' });
      await expect(
        service.create({
          buyerId: BUYER,
          organizationId: null,
          items: [{ offerId: 'offer-por', quantity: 20 }],
          deliveryMethod: 'pickup',
        }),
      ).rejects.toMatchObject({
        response: { code: 'PRICE_REQUEST_NOT_ANSWERED' },
      });
    });

    it('чужой quote не считается (изоляция покупателей)', async () => {
      seedQuote();
      // Quote привязан к BUYER: заказ от OTHER по тому же офферу
      // не имеет права на персональную цену.
      await expect(
        service.create({
          buyerId: OTHER,
          organizationId: null,
          items: [{ offerId: 'offer-por', quantity: 20 }],
          deliveryMethod: 'pickup',
        }),
      ).rejects.toMatchObject({ response: { code: 'PRICE_REQUIRED' } });
    });
  });
});
