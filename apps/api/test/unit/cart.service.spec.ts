/**
 * Unit-тесты CartService (Промт 9, Часть D): границы количества,
 * подсчёт итога, warnings, изоляция корзин по контуру.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from '../../src/cart/cart.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { FakeCartPrisma } from './fake-cart-prisma';

describe('CartService (unit)', () => {
  let service: CartService;
  let prisma: FakeCartPrisma;

  const USER = 'user-1';
  const OTHER = 'user-2';

  beforeEach(() => {
    prisma = new FakeCartPrisma();
    service = new CartService(prisma as unknown as PrismaService);

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
    prisma.offers.set('offer-2', {
      id: 'offer-2',
      productId: 'product-2',
      organizationId: 'org-1',
      priceKopecks: 10400,
      minQuantity: 1,
      badge: null,
      isPerishable: false,
      product: { id: 'product-2', name: 'Огурцы', unit: '1 кг' },
      organization: { id: 'org-1', name: 'Опт-Юг' },
    });
    // Промт 11: остатки — балансы на складе (INITIAL).
    prisma.seedStock('offer-1', 'org-1', 50);
    prisma.seedStock('offer-2', 'org-1', 30);
  });

  it('пустая корзина без записей', async () => {
    const cart = await service.getCart(USER, '');
    expect(cart.items).toEqual([]);
    expect(cart.subtotal).toBe(0);
  });

  it('добавление: итог = цена × количество', async () => {
    const cart = await service.addItem(USER, '', 'offer-1', 10);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].subtotal).toBe(189000);
    expect(cart.subtotal).toBe(189000);
    expect(cart.items[0].offer.product.name).toBe('Помидоры');
  });

  it('повторное добавление инкрементирует количество', async () => {
    await service.addItem(USER, '', 'offer-1', 10);
    const cart = await service.addItem(USER, '', 'offer-1', 5);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(15);
  });

  it('ниже minQuantity — BELOW_MIN_QUANTITY', async () => {
    await expect(service.addItem(USER, '', 'offer-1', 2)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('выше stock — STOCK_EXCEEDED', async () => {
    await expect(service.addItem(USER, '', 'offer-1', 51)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('несуществующий оффер — OFFER_NOT_FOUND', async () => {
    await expect(service.addItem(USER, '', 'nope', 10)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('нулевой доступный остаток — OUT_OF_STOCK', async () => {
    // Промт 11: обнуление баланса (списание всего доступного).
    const balance = [...prisma.stockBalances.values()].find(
      (b) => b.offerId === 'offer-2',
    );
    if (balance) {
      balance.physicalQty = 0;
      balance.availableQty = 0;
    }
    await expect(service.addItem(USER, '', 'offer-2', 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('PATCH количества пересчитывает итог', async () => {
    const added = await service.addItem(USER, '', 'offer-1', 10);
    const itemId = added.items[0].id;
    const cart = await service.updateItem(USER, '', itemId, 20);
    expect(cart.items[0].quantity).toBe(20);
    expect(cart.subtotal).toBe(378000);
  });

  it('PATCH чужой позиции — 404', async () => {
    const added = await service.addItem(USER, '', 'offer-1', 10);
    const itemId = added.items[0].id;
    await expect(service.updateItem(OTHER, '', itemId, 20)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('удаление позиции', async () => {
    const added = await service.addItem(USER, '', 'offer-1', 10);
    const cart = await service.removeItem(USER, '', added.items[0].id);
    expect(cart.items).toHaveLength(0);
  });

  it('очистка корзины', async () => {
    await service.addItem(USER, '', 'offer-1', 10);
    await service.addItem(USER, '', 'offer-2', 3);
    const cart = await service.clear(USER, '');
    expect(cart.items).toHaveLength(0);
    expect(cart.subtotal).toBe(0);
  });

  it('warnings: склад уменьшился ниже количества', async () => {
    await service.addItem(USER, '', 'offer-1', 10);
    // Промт 11: доступный остаток упал до 3 (списание).
    const balance = [...prisma.stockBalances.values()].find(
      (b) => b.offerId === 'offer-1',
    );
    if (balance) {
      balance.physicalQty = 3;
      balance.availableQty = 3;
    }
    const cart = await service.getCart(USER, '');
    expect(cart.warnings).toHaveLength(1);
    expect(cart.warnings[0].message).toContain('3');
  });

  it('контуры изолированы: розница и организация — разные корзины', async () => {
    await service.addItem(USER, '', 'offer-1', 10);
    const orgCart = await service.addItem(USER, 'org-9', 'offer-1', 5);
    expect(orgCart.items[0].quantity).toBe(5);
    const retailCart = await service.getCart(USER, '');
    expect(retailCart.items[0].quantity).toBe(10);
  });

  describe('Персональные цены (Промт 16, C)', () => {
    /** Фикстура: POR-оффер + запрос цены покупателя. */
    const seedPorOffer = (options?: {
      status?: 'PENDING' | 'ANSWERED' | 'DECLINED';
      validUntil?: Date;
    }) => {
      prisma.offers.set('offer-por', {
        id: 'offer-por',
        productId: 'product-por',
        organizationId: 'org-1',
        priceKopecks: 25000,
        priceOnRequest: true,
        minQuantity: 10,
        badge: null,
        isPerishable: false,
        product: { id: 'product-por', name: 'Картофель', unit: '1 кг' },
        organization: { id: 'org-1', name: 'Опт-Юг' },
      });
      prisma.seedStock('offer-por', 'org-1', 100);
      prisma.priceRequests.set('quote-1', {
        id: 'quote-1',
        buyerId: USER,
        offerId: 'offer-por',
        quantity: 20,
        message: null,
        status: options?.status ?? 'ANSWERED',
        quotedPriceKopecks: 22000,
        validUntil:
          options?.validUntil ?? new Date(Date.now() + 24 * 3_600_000),
        respondedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return 'quote-1';
    };

    it('добавление по quote: цена строки = персональная', async () => {
      const quoteId = seedPorOffer();
      const cart = await service.addItem(USER, '', 'offer-por', 20, quoteId);
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].offer.priceKopecks).toBeNull();
      expect(cart.items[0].offer.priceOnRequest).toBe(true);
      expect(cart.items[0].quote?.priceKopecks).toBe(22000);
      expect(cart.items[0].subtotal).toBe(22000 * 20);
      expect(cart.subtotal).toBe(22000 * 20);
    });

    it('POR-оффер без quote — PRICE_REQUIRED', async () => {
      seedPorOffer();
      await expect(
        service.addItem(USER, '', 'offer-por', 20),
      ).rejects.toMatchObject({ response: { code: 'PRICE_REQUIRED' } });
    });

    it('PENDING-запрос — PRICE_REQUEST_NOT_ANSWERED', async () => {
      const quoteId = seedPorOffer({ status: 'PENDING' });
      await expect(
        service.addItem(USER, '', 'offer-por', 20, quoteId),
      ).rejects.toMatchObject({
        response: { code: 'PRICE_REQUEST_NOT_ANSWERED' },
      });
    });

    it('истёкший quote — PRICE_REQUEST_EXPIRED', async () => {
      const quoteId = seedPorOffer({
        validUntil: new Date(Date.now() - 1_000),
      });
      await expect(
        service.addItem(USER, '', 'offer-por', 20, quoteId),
      ).rejects.toMatchObject({
        response: { code: 'PRICE_REQUEST_EXPIRED' },
      });
    });

    it('чужой quote — PRICE_REQUEST_NOT_FOUND (изоляция)', async () => {
      const quoteId = seedPorOffer();
      await expect(
        service.addItem(OTHER, '', 'offer-por', 20, quoteId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('повтор с тем же quote — инкремент количества', async () => {
      const quoteId = seedPorOffer();
      await service.addItem(USER, '', 'offer-por', 20, quoteId);
      const cart = await service.addItem(USER, '', 'offer-por', 10, quoteId);
      expect(cart.items[0].quantity).toBe(30);
    });

    it('смешение режимов — QUOTE_CONFLICT (оффер перестал быть POR)', async () => {
      const quoteId = seedPorOffer();
      await service.addItem(USER, '', 'offer-por', 20, quoteId);
      // Продавец открыл цену после ответа: строка осталась с quote,
      // добавление без quote поверх — конфликт режимов.
      const offer = prisma.offers.get('offer-por');
      if (offer) {
        offer.priceOnRequest = false;
      }
      await expect(
        service.addItem(USER, '', 'offer-por', 10),
      ).rejects.toMatchObject({ response: { code: 'QUOTE_CONFLICT' } });
    });

    it('quote удалён из корзины — повторное добавление без quote запрещено', async () => {
      const quoteId = seedPorOffer();
      const cart = await service.addItem(USER, '', 'offer-por', 20, quoteId);
      expect(cart.items).toHaveLength(1);
      await service.removeItem(USER, '', cart.items[0].id);
      await expect(
        service.addItem(USER, '', 'offer-por', 20),
      ).rejects.toMatchObject({ response: { code: 'PRICE_REQUIRED' } });
    });

    it('истёкший quote в корзине — warning при чтении', async () => {
      const quoteId = seedPorOffer();
      await service.addItem(USER, '', 'offer-por', 20, quoteId);
      // Срок истёк после добавления (вычисляемое истечение).
      const row = prisma.priceRequests.get('quote-1');
      if (row) {
        row.validUntil = new Date(Date.now() - 1_000);
      }
      const updated = await service.getCart(USER, '');
      expect(
        updated.warnings.find((w: { message: string }) =>
          w.message.includes('Срок персональной цены истёк'),
        ),
      ).toBeDefined();
      expect(updated.items[0].quote?.expired).toBe(true);
    });
  });
});
