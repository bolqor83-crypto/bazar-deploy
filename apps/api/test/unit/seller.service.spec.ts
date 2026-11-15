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
  minQuantity: number;
  badge: string | null;
  isPerishable: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  orderItems: { id: string }[];
}

/** Баланс оффера на складе (Промт 11). */
interface FakeBalance {
  id: string;
  offerId: string;
  locationId: string;
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
  updatedAt: Date;
}

/** Движение склада (Промт 11). */
interface FakeMovement {
  id: string;
  offerId: string;
  locationId: string;
  type: string;
  quantityDelta: number;
  reason: string;
  actorId: string | null;
  refType: string | null;
  refId: string | null;
  createdAt: Date;
}

function makeFake() {
  const products = new Map<string, FakeProduct>();
  const offers = new Map<string, FakeOffer>();
  const categories = new Map<
    string,
    { id: string; name: string; slug: string }
  >();
  const priceHistory: {
    offerId: string;
    priceKopecks: number;
    actorId: string | null;
    createdAt: Date;
  }[] = [];
  // Промт 11: склад — склады, балансы, движения (вместо StockChange).
  const stockLocations = new Map<
    string,
    {
      id: string;
      organizationId: string;
      name: string;
      type: string;
      address: string | null;
      isDefault: boolean;
      createdAt: Date;
    }
  >();
  const stockBalances = new Map<string, FakeBalance>();
  const stockMovements = new Map<string, FakeMovement>();

  const productInclude = (record: FakeProduct) => ({
    ...record,
    category: categories.get(record.categoryId) ?? null,
    _count: {
      offers: [...offers.values()].filter((o) => o.productId === record.id)
        .length,
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
    stockBalances: [...stockBalances.values()].filter(
      (b) => b.offerId === record.id,
    ),
    stockMovements: [...stockMovements.values()]
      .filter((m) => m.offerId === record.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
  });

  const matches = (
    record: Record<string, unknown>,
    where: Record<string, unknown>,
  ) => {
    return Object.entries(where).every(([key, value]) => {
      if (value && typeof value === 'object' && value !== null) {
        // { not: null } / { contains, mode } — упрощённые формы.
        if ('not' in (value as object)) {
          return record[key] !== (value as { not: unknown }).not;
        }
        if ('contains' in (value as object)) {
          return String(record[key])
            .toLowerCase()
            .includes(
              String((value as { contains: string }).contains).toLowerCase(),
            );
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
        if (where)
          list = list.filter((p) =>
            matches(p as unknown as Record<string, unknown>, where),
          );
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
              const nameFilter = (
                productFilter as { name: { contains?: string } }
              ).name;
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
              const nameFilter = (
                productFilter as { name: { contains?: string } }
              ).name;
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
        return list
          .slice(skip ?? 0, (skip ?? 0) + (take ?? list.length))
          .map(offerInclude);
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const record = offers.get(where.id);
        return record ? offerInclude(record) : null;
      },
      create: async ({ data }: { data: Partial<FakeOffer> }) => {
        const record: FakeOffer = {
          id: nextId(),
          productId: '',
          organizationId: '',
          priceKopecks: 0,
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
      create: async ({
        data,
      }: {
        data: { offerId: string; priceKopecks: number; actorId: string | null };
      }) => {
        seq += 1;
        priceHistory.push({ ...data, createdAt: new Date(seq) });
        return {};
      },
    },
    // Промт 11: склад — event-sourced (ADR 0012).
    stockLocation: {
      findFirst: async ({
        where,
      }: { where?: { organizationId?: string } } = {}) => {
        let rows = [...stockLocations.values()];
        if (where?.organizationId) {
          rows = rows.filter((l) => l.organizationId === where.organizationId);
        }
        return rows[0] ?? null;
      },
      create: async ({
        data,
      }: {
        data: {
          organizationId: string;
          name: string;
          type: string;
          isDefault: boolean;
        };
      }) => {
        const record = {
          address: null,
          ...data,
          id: nextId(),
          createdAt: new Date(),
        };
        stockLocations.set(record.id, record);
        return record;
      },
    },
    stockBalance: {
      findUnique: async ({
        where,
      }: {
        where: { offerId_locationId: { offerId: string; locationId: string } };
      }) =>
        [...stockBalances.values()].find(
          (b) =>
            b.offerId === where.offerId_locationId.offerId &&
            b.locationId === where.offerId_locationId.locationId,
        ) ?? null,
      findMany: async ({
        where,
      }: {
        where?: { offerId?: string; availableQty?: { gt: number } };
      } = {}) => {
        let rows = [...stockBalances.values()];
        if (where?.offerId)
          rows = rows.filter((b) => b.offerId === where.offerId);
        if (where?.availableQty?.gt !== undefined) {
          rows = rows.filter((b) => b.availableQty > where.availableQty!.gt);
        }
        return rows;
      },
      upsert: async ({
        where,
        create,
      }: {
        where: { offerId_locationId: { offerId: string; locationId: string } };
        create: Omit<FakeBalance, 'id' | 'updatedAt'>;
      }) => {
        const existing = [...stockBalances.values()].find(
          (b) =>
            b.offerId === where.offerId_locationId.offerId &&
            b.locationId === where.offerId_locationId.locationId,
        );
        if (existing) return existing;
        const record: FakeBalance = {
          ...create,
          id: nextId(),
          updatedAt: new Date(),
        };
        stockBalances.set(record.id, record);
        return record;
      },
      update: async ({
        where,
        data,
      }: {
        where: { offerId_locationId: { offerId: string; locationId: string } };
        data: Partial<FakeBalance>;
      }) => {
        const record = [...stockBalances.values()].find(
          (b) =>
            b.offerId === where.offerId_locationId.offerId &&
            b.locationId === where.offerId_locationId.locationId,
        );
        if (!record) throw new Error('balance not found');
        Object.assign(record, data, { updatedAt: new Date() });
        return record;
      },
      deleteMany: async ({ where }: { where?: { offerId?: string } } = {}) => {
        let count = 0;
        for (const [id, balance] of stockBalances) {
          if (!where?.offerId || balance.offerId === where.offerId) {
            stockBalances.delete(id);
            count += 1;
          }
        }
        return { count };
      },
      aggregate: async ({
        where,
        _sum,
      }: {
        where?: { offerId?: string };
        _sum?: Record<string, boolean>;
      }) => {
        let rows = [...stockBalances.values()];
        if (where?.offerId)
          rows = rows.filter((b) => b.offerId === where.offerId);
        const sums: Record<string, number | null> = {};
        for (const key of Object.keys(_sum ?? {})) {
          sums[key] = rows.reduce(
            (sum, b) =>
              sum + ((b as unknown as Record<string, number>)[key] ?? 0),
            0,
          );
        }
        return { _sum: sums };
      },
    },
    stockMovement: {
      create: async ({
        data,
      }: {
        data: Omit<FakeMovement, 'id' | 'createdAt'>;
      }) => {
        seq += 1;
        const record: FakeMovement = {
          ...data,
          id: nextId(),
          createdAt: new Date(seq),
        };
        stockMovements.set(record.id, record);
        return record;
      },
      findMany: async ({
        where,
      }: {
        where?: {
          offerId?: string;
          type?: string;
          refType?: string;
          refId?: string;
        };
      } = {}) => {
        let rows = [...stockMovements.values()];
        if (where?.offerId)
          rows = rows.filter((m) => m.offerId === where.offerId);
        if (where?.type) rows = rows.filter((m) => m.type === where.type);
        if (where?.refType)
          rows = rows.filter((m) => m.refType === where.refType);
        if (where?.refId) rows = rows.filter((m) => m.refId === where.refId);
        return rows;
      },
      count: async ({
        where,
      }: { where?: { offerId?: string; type?: string } } = {}) => {
        let rows = [...stockMovements.values()];
        if (where?.offerId)
          rows = rows.filter((m) => m.offerId === where.offerId);
        if (where?.type) rows = rows.filter((m) => m.type === where.type);
        return rows.length;
      },
      deleteMany: async ({ where }: { where?: { offerId?: string } } = {}) => {
        let count = 0;
        for (const [id, movement] of stockMovements) {
          if (!where?.offerId || movement.offerId === where.offerId) {
            stockMovements.delete(id);
            count += 1;
          }
        }
        return { count };
      },
    },
    // Эмуляция SELECT ... FOR UPDATE (Промт 11).
    $queryRaw: async (query: { values?: unknown[] }) => {
      const values = query.values ?? [];
      const [offerId, locationId] = values as [string, string];
      if (typeof offerId === 'string' && typeof locationId === 'string') {
        const balance = [...stockBalances.values()].find(
          (b) => b.offerId === offerId && b.locationId === locationId,
        );
        return balance ? [{ id: balance.id }] : [];
      }
      return [];
    },
    cartItem: {
      deleteMany: async () => ({ count: 0 }),
    },
  };

  return {
    prisma,
    products,
    offers,
    categories,
    priceHistory,
    stockBalances,
    stockMovements,
  };
}

const SELLER: SellerContext = { userId: 'user-1', organizationId: 'org-1' };

describe('SellerService (unit)', () => {
  let fake: ReturnType<typeof makeFake>;
  let service: SellerService;

  beforeEach(() => {
    fake = makeFake();
    service = new SellerService(fake.prisma as never);
    fake.categories.set('cat-1', {
      id: 'cat-1',
      name: 'Овощи',
      slug: 'ovoshi',
    });
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
      await expect(service.archiveProduct(SELLER, 'alien')).rejects.toThrow(
        'Товар не найден',
      );
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

    it('создаёт оффер: цена в истории, остаток — INITIAL-движение', async () => {
      const offer = await service.createOffer(SELLER, {
        productId,
        price: 4500,
        stock: 100,
        minQuantity: 10,
      });
      expect(offer.price).toBe(4500);
      expect(offer.priceHistory).toHaveLength(1);
      expect(offer.priceHistory[0].price).toBe(4500);
      // Промт 11: остаток — баланс + INITIAL-движение на default-складе.
      expect(offer.stock).toBe(100);
      const movements = [...fake.stockMovements.values()].filter(
        (m) => m.offerId === offer.id,
      );
      expect(movements).toHaveLength(1);
      expect(movements[0]).toMatchObject({
        type: 'INITIAL',
        quantityDelta: 100,
      });
      const balance = [...fake.stockBalances.values()].find(
        (b) => b.offerId === offer.id,
      );
      expect(balance).toMatchObject({
        physicalQty: 100,
        reservedQty: 0,
        availableQty: 100,
      });
    });

    it('смена цены пишет историю, смена остатка — ADJUSTMENT', async () => {
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
      // Промт 11: остаток изменился корректировкой (дельта −20).
      expect(updated.stock).toBe(80);
      const adjustment = [...fake.stockMovements.values()].find(
        (m) => m.offerId === offer.id && m.type === 'ADJUSTMENT',
      );
      expect(adjustment).toMatchObject({
        quantityDelta: -20,
        reason: 'инвентаризация',
      });
      const balance = [...fake.stockBalances.values()].find(
        (b) => b.offerId === offer.id,
      );
      expect(balance).toMatchObject({ physicalQty: 80, availableQty: 80 });
    });

    it('одинаковая цена/остаток не создают записей истории', async () => {
      const offer = await service.createOffer(SELLER, {
        productId,
        price: 4500,
        stock: 100,
      });
      await service.updateOffer(SELLER, offer.id, { price: 4500, stock: 100 });
      const updated = await service.getOffer(SELLER, offer.id);
      expect(updated.priceHistory).toHaveLength(1);
      // Только INITIAL — корректировки не было (журнал Промта 10
      // «previous → new» вычислен из одного движения).
      expect(updated.stockChanges).toHaveLength(1);
      expect(updated.stockChanges[0]).toMatchObject({
        previousStock: 0,
        newStock: 100,
      });
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

    it('удаление с заказами — архив и WRITE_OFF доступного', async () => {
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
      // Промт 11: доступный остаток списан (WRITE_OFF).
      const balance = [...fake.stockBalances.values()].find(
        (b) => b.offerId === offer.id,
      );
      expect(balance?.availableQty).toBe(0);
      const writeOff = [...fake.stockMovements.values()].find(
        (m) => m.offerId === offer.id && m.type === 'WRITE_OFF',
      );
      expect(writeOff).toMatchObject({
        quantityDelta: -10,
        reason: 'Архив предложения',
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
