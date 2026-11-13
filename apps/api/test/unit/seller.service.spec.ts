/**
 * Unit-тесты SellerService (Промт 10, Часть B): товары и предложения.
 *
 * Компактный inline-fake Prisma: покрывает только вызовы сервиса
 * (include-формы, $transaction callback). Полные сценарии — e2e.
 */
import { SellerService } from '../../src/seller/seller.service';
import type { SellerContext } from '../../src/seller/guards/seller-membership.guard';

/** Запись товара в fake. */
interface FakeProduct {
  id: string;
  name: string;
  subtitle: string | null;
  unit: string;
  description: string;
  images: string;
  categoryId: string;
  organizationId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeOffer {
  id: string;
  productId: string;
  organizationId: string;
  priceKopecks: number;
  stock: number;
  minQuantity: number;
  badge: string | null;
  isPerishable: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  orderItems: { id: string }[];
}

function makeFake() {
  const products = new Map<string, FakeProduct>();
  const offers = new Map<string, FakeOffer>();
  const categories = new Map<string, { id: string; name: string; slug: string }>();
  const priceHistory: { offerId: string; priceKopecks: number; actorId: string | null; createdAt: Date }[] = [];
  const stockChanges: { offerId: string; previousStock: number; newStock: number; reason: string; actorId: string | null; createdAt: Date }[] = [];

  const productInclude = (record: FakeProduct) => ({
    ...record,
    category: categories.get(record.categoryId) ?? null,
    _count: {
      offers: [...offers.values()].filter((o) => o.productId === record.id).length,
    },
  });

  const offerInclude = (record: FakeOffer) => ({
    ...record,
    _count: { orderItems: record.orderItems.length },
    product: (() => {
      const product = products.get(record.productId);
      if (!product) return null;
      const { organizationId, archivedAt, ...rest } = product;
      void organizationId;
      void archivedAt;
      return rest;
    })(),
    priceHistory: priceHistory
      .filter((h) => h.offerId === record.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    stockChanges: stockChanges
      .filter((c) => c.offerId === record.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  });

  const matches = (record: Record<string, unknown>, where: Record<string, unknown>) => {
    return Object.entries(where).every(([key, value]) => {
      if (value && typeof value === 'object' && value !== null) {
        // { not: null } / { contains, mode } — упрощённые формы.
        if ('not' in (value as object)) {
          return record[key] !== (value as { not: unknown }).not;
        }
        if ('contains' in (value as object)) {
          return String(record[key])
            .toLowerCase()
            .includes(String((value as { contains: string }).contains).toLowerCase());
        }
      }
      return record[key] === value;
    });
  };

  let counter = 0;
  const nextId = () => `id-${(counter += 1)}`;
  // Монотонное время для сортировки истории (одной ms мало).
  let seq = Date.now();

  const prisma = {
    $transaction: async (arg: unknown) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      return Promise.all(arg as readonly unknown[]);
    },
    category: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        categories.get(where.id) ?? null,
    },
    product: {
      findMany: async ({
        where,
        orderBy,
      }: {
        where?: Record<string, unknown>;
        orderBy?: { updatedAt: 'desc' | 'asc' };
      }) => {
        let list = [...products.values()];
        if (where) list = list.filter((p) => matches(p as unknown as Record<string, unknown>, where));
        if (orderBy?.updatedAt === 'desc') {
          list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        }
        return list.map(productInclude);
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const record = products.get(where.id);
        return record ? productInclude(record) : null;
      },
      create: async ({ data }: { data: Partial<FakeProduct> }) => {
        const record: FakeProduct = {
          id: nextId(),
          name: '',
          subtitle: null,
          unit: '',
          description: '',
          images: '[]',
          categoryId: '',
          organizationId: null,
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        products.set(record.id, record);
        return productInclude(record);
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<FakeProduct>;
      }) => {
        const record = products.get(where.id);
        if (!record) throw new Error('product not found');
        Object.assign(record, data, { updatedAt: new Date() });
        return productInclude(record);
      },
    },
    productOffer: {
      count: async ({ where }: { where?: Record<string, unknown> }) => {
        let list = [...offers.values()];
        if (where) {
          list = list.filter((o) => {
            // where.product.name.contains обрабатываем отдельно.
            const { product: productFilter, ...rest } = where;
            if (
              productFilter &&
              typeof productFilter === 'object' &&
              'name' in (productFilter as object)
            ) {
              const nameFilter = (productFilter as { name: { contains?: string } }).name;
              if (nameFilter?.contains) {
                const product = products.get(o.productId);
                if (
                  !product ||
                  !product.name
                    .toLowerCase()
                    .includes(nameFilter.contains.toLowerCase())
                ) {
                  return false;
                }
              }
            }
            return matches(o as unknown as Record<string, unknown>, rest);
          });
        }
        return list.length;
      },
      findMany: async ({
        where,
        orderBy,
        skip,
        take,
      }: {
        where?: Record<string, unknown>;
        orderBy?: { updatedAt: 'desc' | 'asc' };
        skip?: number;
        take?: number;
      }) => {
        let list = [...offers.values()];
        if (where) {
          const { product: productFilter, ...rest } = where;
          list = list.filter((o) => {
            if (
              productFilter &&
              typeof productFilter === 'object' &&
              'name' in (productFilter as object)
            ) {
              const nameFilter = (productFilter as { name: { contains?: string } }).name;
              if (nameFilter?.contains) {
                const product = products.get(o.productId);
                if (
                  !product ||
                  !product.name
                    .toLowerCase()
                    .includes(nameFilter.contains.toLowerCase())
                ) {
                  return false;
                }
              }
            }
            return matches(o as unknown as Record<string, unknown>, rest);
          });
        }
        if (orderBy?.updatedAt === 'desc') {
          list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        }
        return list.slice(skip ?? 0, (skip ?? 0) + (take ?? list.length)).map(offerInclude);
      },
      findUnique: async ({
        where,
      }: {
        where: { id: string };
      }) => {
        const record = offers.get(where.id);
        return record ? offerInclude(record) : null;
      },
      create: async ({ data }: { data: Partial<FakeOffer> }) => {
        const record: FakeOffer = {
          id: nextId(),
          productId: '',
          organizationId: '',
          priceKopecks: 0,
          stock: 0,
          minQuantity: 1,
          badge: null,
          isPerishable: false,
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          orderItems: [],
          ...data,
        };
        offers.set(record.id, record);
        return offerInclude(record);
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<FakeOffer>;
      }) => {
        const record = offers.get(where.id);
        if (!record) throw new Error('offer not found');
        Object.assign(record, data, { updatedAt: new Date() });
        return offerInclude(record);
      },
      delete: async ({ where }: { where: { id: string } }) => {
        offers.delete(where.id);
        return {};
      },
    },
    offerPriceHistory: {
      create: async ({ data }: { data: { offerId: string; priceKopecks: number; actorId: string | null } }) => {
        seq += 1;
        priceHistory.push({ ...data, createdAt: new Date(seq) });
        return {};
      },
    },
    stockChange: {
      create: async ({ data }: { data: { offerId: string; previousStock: number; newStock: number; reason: string; actorId: string | null } }) => {
        seq += 1;
        stockChanges.push({ ...data, createdAt: new Date(seq) });
        return {};
      },
    },
    cartItem: {
      deleteMany: async () => ({ count: 0 }),
    },
  };

  return { prisma, products, offers, categories, priceHistory, stockChanges };
}

const SELLER: SellerContext = { userId: 'user-1', organizationId: 'org-1' };

describe('SellerService (unit)', () => {
  let fake: ReturnType<typeof makeFake>;
  let service: SellerService;

  beforeEach(() => {
    fake = makeFake();
    service = new SellerService(fake.prisma as never);
    fake.categories.set('cat-1', { id: 'cat-1', name: 'Овощи', slug: 'ovoshi' });
  });

  describe('products', () => {
    it('создаёт товар организации с title→name', async () => {
      const product = await service.createProduct(SELLER, {
        title: 'Морковь мытая',
        subtitle: 'Партия нового урожая',
        categoryId: 'cat-1',
        unit: 'кг',
      });
      expect(product.title).toBe('Морковь мытая');
      expect(product.archivedAt).toBeNull();
      expect(fake.products.get(product.id)?.organizationId).toBe('org-1');
    });

    it('несуществующая категория — 404 CATEGORY_NOT_FOUND', async () => {
      await expect(
        service.createProduct(SELLER, {
          title: 'Тест',
          categoryId: 'nope',
          unit: 'кг',
        }),
      ).rejects.toMatchObject({ response: { code: 'CATEGORY_NOT_FOUND' } });
    });

    it('список только своей организации и без архива', async () => {
      await service.createProduct(SELLER, {
        title: 'Мой товар',
        categoryId: 'cat-1',
        unit: 'кг',
      });
      fake.products.set('alien', {
        id: 'alien',
        name: 'Чужой товар',
        subtitle: null,
        unit: 'кг',
        description: '',
        images: '[]',
        categoryId: 'cat-1',
        organizationId: 'org-2',
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const own = await service.listProducts(SELLER, {});
      expect(own).toHaveLength(1);
      expect(own[0].title).toBe('Мой товар');

      const archivedList = await service.listProducts(SELLER, {
        archived: true,
      });
      expect(archivedList).toHaveLength(0);
    });

    it('архив ставит archivedAt, товар виден в archived-списке', async () => {
      const product = await service.createProduct(SELLER, {
        title: 'Старый товар',
        categoryId: 'cat-1',
        unit: 'кг',
      });
      const archived = await service.archiveProduct(SELLER, product.id);
      expect(archived.archivedAt).not.toBeNull();
      const list = await service.listProducts(SELLER, { archived: true });
      expect(list).toHaveLength(1);
    });

    it('чужой товар — 404', async () => {
      fake.products.set('alien', {
        id: 'alien',
        name: 'Чужой',
        subtitle: null,
        unit: 'кг',
        description: '',
        images: '[]',
        categoryId: 'cat-1',
        organizationId: 'org-2',
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await expect(
        service.archiveProduct(SELLER, 'alien'),
      ).rejects.toThrow('Товар не найден');
    });
  });

  describe('offers', () => {
    let productId: string;

    beforeEach(async () => {
      const product = await service.createProduct(SELLER, {
        title: 'Морковь',
        categoryId: 'cat-1',
        unit: 'кг',
      });
      productId = product.id;
    });

    it('создаёт оффер с начальной историей цены и склада', async () => {
      const offer = await service.createOffer(SELLER, {
        productId,
        price: 4500,
        stock: 100,
        minQuantity: 10,
      });
      expect(offer.price).toBe(4500);
      expect(offer.priceHistory).toHaveLength(1);
      expect(offer.priceHistory[0].price).toBe(4500);
      expect(offer.stockChanges).toHaveLength(1);
      expect(offer.stockChanges[0]).toMatchObject({
        previousStock: 0,
        newStock: 100,
        reason: 'creation',
      });
    });

    it('смена цены пишет OfferPriceHistory, смена склада — StockChange', async () => {
      const offer = await service.createOffer(SELLER, {
        productId,
        price: 4500,
        stock: 100,
      });
      await service.updateOffer(SELLER, offer.id, {
        price: 4900,
        stock: 80,
        stockReason: 'инвентаризация',
      });
      const updated = await service.getOffer(SELLER, offer.id);
      expect(updated.price).toBe(4900);
      expect(updated.priceHistory).toHaveLength(2);
      expect(updated.priceHistory[0].price).toBe(4900);
      expect(updated.stockChanges[0]).toMatchObject({
        previousStock: 100,
        newStock: 80,
        reason: 'инвентаризация',
      });
    });

    it('одинаковая цена/склад не создают записей истории', async () => {
      const offer = await service.createOffer(SELLER, {
        productId,
        price: 4500,
        stock: 100,
      });
      await service.updateOffer(SELLER, offer.id, { price: 4500, stock: 100 });
      const updated = await service.getOffer(SELLER, offer.id);
      expect(updated.priceHistory).toHaveLength(1);
      expect(updated.stockChanges).toHaveLength(1);
    });

    it('удаление без заказов — физическое', async () => {
      const offer = await service.createOffer(SELLER, {
        productId,
        price: 4500,
        stock: 10,
      });
      const result = await service.deleteOffer(SELLER, offer.id);
      expect(result).toEqual({ archived: false });
      expect(fake.offers.has(offer.id)).toBe(false);
    });

    it('удаление с заказами — архив и stock=0', async () => {
      const offer = await service.createOffer(SELLER, {
        productId,
        price: 4500,
        stock: 10,
      });
      const record = fake.offers.get(offer.id);
      if (record) record.orderItems.push({ id: 'oi-1' });
      const result = await service.deleteOffer(SELLER, offer.id);
      expect(result).toEqual({ archived: true });
      const archived = fake.offers.get(offer.id);
      expect(archived?.archivedAt).not.toBeNull();
      expect(archived?.stock).toBe(0);
      expect(fake.stockChanges.at(-1)).toMatchObject({
        previousStock: 10,
        newStock: 0,
        reason: 'archived',
      });
    });

    it('photos из оффера попадают в images товара', async () => {
      await service.createOffer(SELLER, {
        productId,
        price: 4500,
        stock: 10,
        images: ['https://cdn.example/p1.jpg'],
      });
      const product = fake.products.get(productId);
      expect(JSON.parse(product?.images ?? '[]')).toEqual([
        'https://cdn.example/p1.jpg',
      ]);
    });
  });
});
