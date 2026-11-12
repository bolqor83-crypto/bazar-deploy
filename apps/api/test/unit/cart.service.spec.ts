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
      stock: 50,
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
      stock: 30,
      minQuantity: 1,
      badge: null,
      isPerishable: false,
      product: { id: 'product-2', name: 'Огурцы', unit: '1 кг' },
      organization: { id: 'org-1', name: 'Опт-Юг' },
    });
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

  it('stock 0 — OUT_OF_STOCK', async () => {
    const offer = prisma.offers.get('offer-2') as { stock: number };
    offer.stock = 0;
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
    const offer = prisma.offers.get('offer-1') as { stock: number };
    offer.stock = 3;
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
});
