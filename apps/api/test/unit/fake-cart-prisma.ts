/**
 * Фейковый Prisma для unit-тестов корзины и заказов (Промт 9).
 *
 * In-memory хранилища Map; $transaction эмулирует откат через
 * structuredClone-снапшот (реальный откат проверяется e2e на Neon).
 *
 * Промт 11: склад — event-sourced (ADR 0012). Фейк хранит склады,
 * балансы и движения; SELECT ... FOR UPDATE эмулируется через
 * $queryRaw (поиск баланса по offerId/locationId из параметров).
 */
import type { Prisma } from '@prisma/client';

export interface FakeOffer {
  id: string;
  productId: string;
  organizationId: string;
  priceKopecks: number;
  /** Промт 16 (C): «цена по запросу» (undefined ≡ false в фикстурах). */
  priceOnRequest?: boolean;
  minQuantity: number;
  badge: string | null;
  isPerishable: boolean;
  product: { id: string; name: string; unit: string };
  organization: { id: string; name: string };
}

export interface FakeStockLocation {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  address: string | null;
  isDefault: boolean;
  createdAt: Date;
}

export interface FakeStockBalance {
  id: string;
  offerId: string;
  locationId: string;
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
  updatedAt: Date;
}

export interface FakeStockMovement {
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

export interface FakeCartItem {
  id: string;
  cartId: string;
  offerId: string;
  quantity: number;
  /** Промт 16 (C): персональное предложение позиции. */
  priceRequestId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  offer: FakeOffer;
}

/** Запрос цены (Промт 16, C) — минимальная форма для корзины. */
export interface FakePriceRequest {
  id: string;
  buyerId: string;
  offerId: string;
  quantity: number;
  message: string | null;
  status: 'PENDING' | 'ANSWERED' | 'DECLINED';
  quotedPriceKopecks: number | null;
  validUntil: Date | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeCart {
  id: string;
  userId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeOrder {
  id: string;
  number: string;
  buyerId: string;
  sellerId: string;
  organizationId: string | null;
  status: string;
  subtotal: number;
  deliveryCost: number;
  total: number;
  address: string | null;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  seller: { id: string; name: string };
  buyer?: { id: string; name: string; phone: string };
  items: {
    id: string;
    orderId: string;
    offerId: string;
    title: string;
    unit: string;
    price: number;
    quantity: number;
    total: number;
  }[];
  events: {
    id: string;
    orderId: string;
    type: string;
    actorId: string | null;
    payload: string | null;
    createdAt: Date;
  }[];
  /** Доставки заказа (Промт 10, Часть D) — пусто в тестах заказов. */
  deliveries: {
    id: string;
    number: string;
    status: string;
    carrierOrganizationId: string | null;
    dropoffAddress: string;
    price: number | null;
    carrierOrganization: { name: string } | null;
  }[];
}

/** Уведомление (Промт 10, Часть C). */
export interface FakeNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  payload: string | null;
  orderId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export class FakeCartPrisma {
  readonly offers = new Map<string, FakeOffer>();
  readonly carts = new Map<string, FakeCart>();
  readonly cartItems = new Map<string, FakeCartItem>();
  /** Промт 16 (C): запросы цены. */
  readonly priceRequests = new Map<string, FakePriceRequest>();
  readonly orders = new Map<string, FakeOrder>();
  readonly orderCounters = new Map<number, { year: number; seq: number }>();
  readonly memberships = new Map<
    string,
    { userId: string; organizationId: string; role?: string }
  >();
  readonly users = new Map<
    string,
    { id: string; name: string; phone: string }
  >();
  /** Уведомления — массив: порядок создания важен для проверок. */
  readonly notifications: FakeNotification[] = [];

  // Склад (Промт 11): склады, балансы, движения.
  readonly stockLocations = new Map<string, FakeStockLocation>();
  readonly stockBalances = new Map<string, FakeStockBalance>();
  readonly stockMovements = new Map<string, FakeStockMovement>();

  private counter = 0;
  nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${String(this.counter).padStart(4, '0')}`;
  }

  /**
   * Начальный остаток оффера для фикстур: default-склад организации
   * (создаётся при отсутствии) + INITIAL-движение + баланс.
   */
  seedStock(offerId: string, organizationId: string, qty: number): void {
    let location = [...this.stockLocations.values()].find(
      (l) => l.organizationId === organizationId,
    );
    if (!location) {
      location = {
        id: this.nextId('loc'),
        organizationId,
        name: 'Основной склад',
        type: 'WAREHOUSE',
        address: null,
        isDefault: true,
        createdAt: new Date(),
      };
      this.stockLocations.set(location.id, location);
    }
    if (qty > 0) {
      const movementId = this.nextId('movement');
      this.stockMovements.set(movementId, {
        id: movementId,
        offerId,
        locationId: location.id,
        type: 'INITIAL',
        quantityDelta: qty,
        reason: 'Начальный остаток (фикстура)',
        actorId: null,
        refType: 'initial',
        refId: offerId,
        createdAt: new Date(),
      });
      const id = this.nextId('balance');
      this.stockBalances.set(id, {
        id,
        offerId,
        locationId: location.id,
        physicalQty: qty,
        reservedQty: 0,
        availableQty: qty,
        updatedAt: new Date(),
      });
    }
  }

  /** Доступный остаток оффера (сумма балансов) — для проверок тестов. */
  availableOf(offerId: string): number {
    return [...this.stockBalances.values()]
      .filter((b) => b.offerId === offerId)
      .reduce((sum, b) => sum + b.availableQty, 0);
  }

  readonly productOffer = {
    findUnique: async ({
      where,
      select,
    }: {
      where: { id: string };
      select?: Record<string, unknown>;
    }) => {
      const offer = this.offers.get(where.id);
      if (!offer) return null;
      if (select && 'stockBalances' in select) {
        return {
          ...offer,
          stockBalances: [...this.stockBalances.values()]
            .filter((b) => b.offerId === where.id)
            .map((b) => ({ availableQty: b.availableQty })),
        };
      }
      return offer;
    },
    findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in
        .map((id) => this.offers.get(id))
        .filter((o): o is FakeOffer => !!o),
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const offer = this.offers.get(where.id);
      if (!offer) throw new Error('offer not found');
      Object.assign(offer, data);
      return offer;
    },
  };

  readonly stockLocation = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.stockLocations.get(where.id) ?? null,
    findFirst: async ({
      where,
      orderBy,
      select,
    }: {
      where?: { organizationId?: string };
      orderBy?: unknown;
      select?: unknown;
    } = {}) => {
      void orderBy;
      void select;
      let rows = [...this.stockLocations.values()];
      if (where?.organizationId) {
        rows = rows.filter((l) => l.organizationId === where.organizationId);
      }
      return rows[0] ?? null;
    },
    findMany: async ({
      where,
    }: { where?: { organizationId?: string } } = {}) => {
      let rows = [...this.stockLocations.values()];
      if (where?.organizationId) {
        rows = rows.filter((l) => l.organizationId === where.organizationId);
      }
      return rows;
    },
    create: async ({
      data,
    }: {
      data: Omit<FakeStockLocation, 'id' | 'createdAt'>;
    }) => {
      const record: FakeStockLocation = {
        ...data,
        address: data.address ?? null,
        id: this.nextId('loc'),
        createdAt: new Date(),
      };
      this.stockLocations.set(record.id, record);
      return record;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeStockLocation>;
    }) => {
      const record = this.stockLocations.get(where.id);
      if (!record) throw new Error('stock location not found');
      Object.assign(record, data);
      this.stockLocations.set(where.id, record);
      return record;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: Record<string, unknown>;
      data: Partial<FakeStockLocation>;
    }) => {
      let count = 0;
      for (const [id, location] of this.stockLocations) {
        const record = location as unknown as Record<string, unknown>;
        const matches = Object.entries(where).every(([key, value]) => {
          // { not: value } — исключающее условие (смена default).
          if (
            value &&
            typeof value === 'object' &&
            'not' in (value as object)
          ) {
            return record[key] !== (value as { not: unknown }).not;
          }
          return record[key] === value;
        });
        if (matches) {
          this.stockLocations.set(id, { ...location, ...data });
          count += 1;
        }
      }
      return { count };
    },
    delete: async ({ where }: { where: { id: string } }) => {
      this.stockLocations.delete(where.id);
      return null;
    },
  };

  readonly stockBalance = {
    findUnique: async ({
      where,
    }: {
      where: { offerId_locationId: { offerId: string; locationId: string } };
    }) => {
      const balance =
        [...this.stockBalances.values()].find(
          (b) =>
            b.offerId === where.offerId_locationId.offerId &&
            b.locationId === where.offerId_locationId.locationId,
        ) ?? null;
      if (!balance) return null;
      // include: location.name (для view остатка).
      return {
        ...balance,
        location: {
          name: this.stockLocations.get(balance.locationId)?.name ?? '',
        },
      };
    },
    findFirst: async ({
      where,
    }: {
      where?: { offerId?: string };
    } = {}) => {
      let rows = [...this.stockBalances.values()];
      if (where?.offerId)
        rows = rows.filter((b) => b.offerId === where.offerId);
      return rows[0] ?? null;
    },
    findMany: async ({
      where,
      orderBy,
      include,
    }: {
      where?: {
        offerId?: string;
        locationId?: string | { in: string[] };
        availableQty?: { gt: number };
      };
      orderBy?: unknown;
      include?: { location?: unknown };
    } = {}) => {
      void orderBy;
      void include;
      let rows = [...this.stockBalances.values()];
      if (where?.offerId)
        rows = rows.filter((b) => b.offerId === where.offerId);
      const locationFilter = where?.locationId;
      if (locationFilter) {
        rows =
          typeof locationFilter === 'string'
            ? rows.filter((b) => b.locationId === locationFilter)
            : rows.filter((b) => locationFilter.in.includes(b.locationId));
      }
      const gt = where?.availableQty?.gt;
      if (gt !== undefined) {
        rows = rows.filter((b) => b.availableQty > gt);
      }
      // include: location.name (для view остатков).
      return rows.map((b) => ({
        ...b,
        location: {
          name: this.stockLocations.get(b.locationId)?.name ?? '',
        },
      }));
    },
    upsert: async ({
      where,
      create,
    }: {
      where: { offerId_locationId: { offerId: string; locationId: string } };
      create: Omit<FakeStockBalance, 'id' | 'updatedAt'>;
    }) => {
      const existing = await this.stockBalance.findUnique({ where });
      if (existing) return existing;
      const record: FakeStockBalance = {
        ...create,
        id: this.nextId('balance'),
        updatedAt: new Date(),
      };
      this.stockBalances.set(record.id, record);
      return record;
    },
    update: async ({
      where,
      data,
    }: {
      where: { offerId_locationId: { offerId: string; locationId: string } };
      data: Partial<FakeStockBalance>;
    }) => {
      const record = await this.stockBalance.findUnique({ where });
      if (!record) throw new Error('balance not found');
      Object.assign(record, data, { updatedAt: new Date() });
      this.stockBalances.set(record.id, record);
      return record;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { offerId?: string; locationId?: string };
      data: Partial<FakeStockBalance>;
    }) => {
      let count = 0;
      for (const [id, balance] of this.stockBalances) {
        const matches =
          (!where.offerId || balance.offerId === where.offerId) &&
          (!where.locationId || balance.locationId === where.locationId);
        if (matches) {
          this.stockBalances.set(id, { ...balance, ...data });
          count += 1;
        }
      }
      return { count };
    },
    deleteMany: async ({
      where,
    }: { where?: { offerId?: string; locationId?: string } } = {}) => {
      let count = 0;
      for (const [id, balance] of this.stockBalances) {
        const matches =
          (!where?.offerId || balance.offerId === where.offerId) &&
          (!where?.locationId || balance.locationId === where.locationId);
        if (matches) {
          this.stockBalances.delete(id);
          count += 1;
        }
      }
      return { count };
    },
    count: async ({
      where,
    }: {
      where?: {
        offerId?: string;
        locationId?: string;
        physicalQty?: { not: number };
      };
    } = {}) => {
      let rows = [...this.stockBalances.values()];
      if (where?.offerId)
        rows = rows.filter((b) => b.offerId === where.offerId);
      if (where?.locationId)
        rows = rows.filter((b) => b.locationId === where.locationId);
      if (where?.physicalQty?.not !== undefined) {
        rows = rows.filter((b) => b.physicalQty !== where.physicalQty!.not);
      }
      return rows.length;
    },
    aggregate: async ({
      where,
      _sum,
    }: {
      where?: { offerId?: string };
      _sum?: Record<string, boolean>;
    }) => {
      let rows = [...this.stockBalances.values()];
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
  };

  readonly stockMovement = {
    findMany: async ({
      where,
      orderBy,
      include,
      skip,
      take,
    }: {
      where?: {
        offerId?: string;
        locationId?: string;
        type?: string;
        refType?: string;
        refId?: string;
      };
      orderBy?: unknown;
      include?: unknown;
      skip?: number;
      take?: number;
    } = {}) => {
      void orderBy;
      let rows = [...this.stockMovements.values()];
      if (where?.offerId)
        rows = rows.filter((m) => m.offerId === where.offerId);
      if (where?.locationId)
        rows = rows.filter((m) => m.locationId === where.locationId);
      if (where?.type) rows = rows.filter((m) => m.type === where.type);
      if (where?.refType)
        rows = rows.filter((m) => m.refType === where.refType);
      if (where?.refId) rows = rows.filter((m) => m.refId === where.refId);
      // Дефолт сервиса — свежие сверху.
      rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      rows = rows.slice(skip ?? 0, (skip ?? 0) + (take ?? rows.length));
      // include: offer.product.name + location.name (для view).
      return rows.map((m) => ({
        ...m,
        offer: {
          product: { name: this.offers.get(m.offerId)?.product.name ?? '' },
        },
        location: {
          name: this.stockLocations.get(m.locationId)?.name ?? '',
        },
      }));
    },
    create: async ({
      data,
    }: {
      data: Omit<FakeStockMovement, 'id' | 'createdAt'>;
    }) => {
      const record: FakeStockMovement = {
        ...data,
        id: this.nextId('movement'),
        createdAt: new Date(),
      };
      this.stockMovements.set(record.id, record);
      return record;
    },
    count: async ({
      where,
    }: {
      where?: {
        offerId?: string;
        locationId?: string;
        type?: string;
      };
    } = {}) => {
      let rows = [...this.stockMovements.values()];
      if (where?.offerId)
        rows = rows.filter((m) => m.offerId === where.offerId);
      if (where?.locationId)
        rows = rows.filter((m) => m.locationId === where.locationId);
      if (where?.type) rows = rows.filter((m) => m.type === where.type);
      return rows.length;
    },
    deleteMany: async ({ where }: { where?: { offerId?: string } } = {}) => {
      let count = 0;
      for (const [id, movement] of this.stockMovements) {
        if (!where?.offerId || movement.offerId === where.offerId) {
          this.stockMovements.delete(id);
          count += 1;
        }
      }
      return { count };
    },
  };

  /**
   * Эмуляция SELECT ... FOR UPDATE: Prisma.sql с параметрами
   * [offerId, locationId] → строка баланса, если существует.
   */
  $queryRaw = async (query: Prisma.Sql): Promise<{ id: string }[]> => {
    const values = (query as unknown as { values?: unknown[] }).values ?? [];
    const [offerId, locationId] = values as [string, string];
    if (typeof offerId === 'string' && typeof locationId === 'string') {
      const balance = [...this.stockBalances.values()].find(
        (b) => b.offerId === offerId && b.locationId === locationId,
      );
      return balance ? [{ id: balance.id }] : [];
    }
    return [];
  };

  readonly cart = {
    findUnique: async ({
      where,
    }: {
      where: {
        userId_organizationId: { userId: string; organizationId: string };
      };
    }) => {
      for (const cart of this.carts.values()) {
        if (
          cart.userId === where.userId_organizationId.userId &&
          cart.organizationId === where.userId_organizationId.organizationId
        ) {
          return cart;
        }
      }
      return null;
    },
    upsert: async ({
      where,
      create,
    }: {
      where: {
        userId_organizationId: { userId: string; organizationId: string };
      };
      create: { userId: string; organizationId: string };
    }) => {
      const existing = await this.cart.findUnique({ where });
      if (existing) return existing;
      const record: FakeCart = {
        id: this.nextId('cart'),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...create,
      };
      this.carts.set(record.id, record);
      return record;
    },
  };

  /** Промт 16 (C): запросы цены — чтение для валидации quote. */
  readonly priceRequest = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.priceRequests.get(where.id) ?? null,
    findFirst: async ({ where }: { where: Record<string, unknown> }) =>
      [...this.priceRequests.values()].find((r) => {
        if (typeof where.buyerId === 'string' && r.buyerId !== where.buyerId) {
          return false;
        }
        if (typeof where.offerId === 'string' && r.offerId !== where.offerId) {
          return false;
        }
        if (typeof where.status === 'string' && r.status !== where.status) {
          return false;
        }
        return true;
      }) ?? null,
  };

  readonly cartItem = {
    findUnique: async ({
      where,
    }: {
      where: {
        id?: string;
        cartId_offerId?: { cartId: string; offerId: string };
      };
      include?: unknown;
      select?: unknown;
    }) => {
      // По id или по составному ключу (cartId, offerId) — Промт 16, C.
      let item: FakeCartItem | undefined;
      if (where.id) {
        item = this.cartItems.get(where.id);
      } else if (where.cartId_offerId) {
        item = [...this.cartItems.values()].find(
          (i) =>
            i.cartId === where.cartId_offerId!.cartId &&
            i.offerId === where.cartId_offerId!.offerId,
        );
      }
      if (!item) return null;
      const cart = [...this.carts.values()].find((c) => c.id === item!.cartId);
      return {
        ...item,
        offer: {
          ...item.offer,
          stockBalances: [...this.stockBalances.values()]
            .filter((b) => b.offerId === item!.offerId)
            .map((b) => ({ availableQty: b.availableQty })),
        },
        priceRequest: item.priceRequestId
          ? (this.priceRequests.get(item.priceRequestId) ?? null)
          : null,
        cart: { userId: cart?.userId },
      };
    },
    findMany: async ({
      where,
      orderBy,
      include,
    }: {
      where: {
        cartId?: string;
        cart?: { userId?: string };
        offerId?: { in?: string[] };
      };
      orderBy?: unknown;
      include?: { offer?: { include?: unknown } };
    }) => {
      void orderBy;
      void include;
      const items = [...this.cartItems.values()]
        .filter((i) => {
          if (where.cartId && i.cartId !== where.cartId) return false;
          if (where.cart?.userId) {
            const cart = this.carts.get(i.cartId);
            if (!cart || cart.userId !== where.cart?.userId) return false;
          }
          if (where.offerId?.in && !where.offerId.in.includes(i.offerId)) {
            return false;
          }
          return true;
        })
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      return items.map((item) => ({
        ...item,
        offer: {
          ...item.offer,
          stockBalances: [...this.stockBalances.values()]
            .filter((b) => b.offerId === item.offerId)
            .map((b) => ({ availableQty: b.availableQty })),
        },
        priceRequest: item.priceRequestId
          ? (this.priceRequests.get(item.priceRequestId) ?? null)
          : null,
      }));
    },
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { cartId_offerId: { cartId: string; offerId: string } };
      create: { cartId: string; offerId: string; quantity: number };
      update: { quantity: { increment: number } };
    }) => {
      for (const item of this.cartItems.values()) {
        if (
          item.cartId === where.cartId_offerId.cartId &&
          item.offerId === where.cartId_offerId.offerId
        ) {
          item.quantity += update.quantity.increment;
          return item;
        }
      }
      const offer = this.offers.get(create.offerId);
      const record: FakeCartItem = {
        id: this.nextId('cart-item'),
        createdAt: new Date(),
        updatedAt: new Date(),
        quantity: create.quantity,
        cartId: create.cartId,
        offerId: create.offerId,
        offer: offer as FakeOffer,
      };
      this.cartItems.set(record.id, record);
      return record;
    },
    /** Промт 16 (C): прямое создание строки (в т.ч. с priceRequestId). */
    create: async ({
      data,
    }: {
      data: {
        cartId: string;
        offerId: string;
        quantity: number;
        priceRequestId?: string | null;
      };
    }) => {
      const offer = this.offers.get(data.offerId);
      const record: FakeCartItem = {
        id: this.nextId('cart-item'),
        createdAt: new Date(),
        updatedAt: new Date(),
        quantity: data.quantity,
        cartId: data.cartId,
        offerId: data.offerId,
        priceRequestId: data.priceRequestId ?? null,
        offer: offer as FakeOffer,
      };
      this.cartItems.set(record.id, record);
      return record;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { quantity: number | { increment: number } };
    }) => {
      const item = this.cartItems.get(where.id);
      if (!item) throw new Error('cart item not found');
      item.quantity =
        typeof data.quantity === 'number'
          ? data.quantity
          : item.quantity + data.quantity.increment;
      return item;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      this.cartItems.delete(where.id);
      return null;
    },
    deleteMany: async ({
      where,
    }: {
      where: { cartId?: string; offerId?: string };
    }) => {
      let count = 0;
      for (const [id, item] of this.cartItems) {
        const matches =
          (!where.cartId || item.cartId === where.cartId) &&
          (!where.offerId || item.offerId === where.offerId);
        if (matches) {
          this.cartItems.delete(id);
          count += 1;
        }
      }
      return { count };
    },
  };

  readonly order = {
    create: async ({
      data,
    }: {
      data: {
        number: string;
        buyerId: string;
        sellerId: string;
        organizationId: string | null;
        status: string;
        subtotal: number;
        deliveryCost: number;
        total: number;
        address: string | null;
        comment: string | null;
        items: {
          create: {
            offerId: string;
            title: string;
            unit: string;
            price: number;
            quantity: number;
            total: number;
          }[];
        };
        events: { create: { type: string; actorId: string; payload: string } };
      };
    }) => {
      const seller = [...this.offers.values()].find(
        (o) => o.organization.id === data.sellerId,
      )?.organization ?? { id: data.sellerId, name: 'Продавец' };
      const record: FakeOrder = {
        id: this.nextId('order'),
        createdAt: new Date(),
        updatedAt: new Date(),
        number: data.number,
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        organizationId: data.organizationId,
        status: data.status,
        subtotal: data.subtotal,
        deliveryCost: data.deliveryCost,
        total: data.total,
        address: data.address,
        comment: data.comment,
        seller,
        items: data.items.create.map((item, i) => ({
          id: `${this.nextId('order-item')}-${i}`,
          orderId: '',
          ...item,
        })),
        events: [
          {
            id: this.nextId('order-event'),
            orderId: '',
            type: data.events.create.type,
            actorId: data.events.create.actorId,
            payload: data.events.create.payload,
            createdAt: new Date(),
          },
        ],
        deliveries: [],
      };
      record.items.forEach((i) => (i.orderId = record.id));
      record.events.forEach((e) => (e.orderId = record.id));
      this.orders.set(record.id, record);
      return record;
    },
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.orders.get(where.id) ?? null,
    findFirst: async ({
      where,
      include,
    }: {
      where: { id?: string; sellerId?: string };
      include?: unknown;
    }) => {
      void include;
      for (const order of this.orders.values()) {
        if (where.id && order.id !== where.id) continue;
        if (where.sellerId && order.sellerId !== where.sellerId) continue;
        return order;
      }
      return null;
    },
    findMany: async ({
      where,
      orderBy,
      skip,
      take,
    }: {
      where?: {
        buyerId?: string;
        sellerId?: string;
        status?: string | { in: string[] };
        OR?: {
          number?: { contains: string; mode?: string };
          buyer?: { name?: { contains: string; mode?: string } };
        }[];
      };
      orderBy?: unknown;
      skip?: number;
      take?: number;
    }) => {
      void orderBy;
      let rows = [...this.orders.values()];
      if (where?.buyerId)
        rows = rows.filter((o) => o.buyerId === where.buyerId);
      if (where?.sellerId)
        rows = rows.filter((o) => o.sellerId === where.sellerId);
      if (where?.status) {
        rows =
          typeof where.status === 'string'
            ? rows.filter((o) => o.status === where.status)
            : rows.filter((o) =>
                (where.status as { in: string[] }).in.includes(o.status),
              );
      }
      if (where?.OR) {
        const term = where.OR[0]?.number?.contains ?? '';
        const lower = term.toLowerCase();
        rows = rows.filter(
          (o) =>
            o.number.toLowerCase().includes(lower) ||
            (o.buyer?.name ?? '').toLowerCase().includes(lower),
        );
      }
      rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return rows.slice(skip ?? 0, (skip ?? 0) + (take ?? rows.length));
    },
    count: async ({
      where,
    }: {
      where?: {
        buyerId?: string;
        sellerId?: string;
        status?: string | { in: string[] };
        OR?: {
          number?: { contains: string; mode?: string };
          buyer?: { name?: { contains: string; mode?: string } };
        }[];
      };
    }) => {
      let rows = [...this.orders.values()];
      if (where?.buyerId)
        rows = rows.filter((o) => o.buyerId === where.buyerId);
      if (where?.sellerId)
        rows = rows.filter((o) => o.sellerId === where.sellerId);
      if (where?.status) {
        rows =
          typeof where.status === 'string'
            ? rows.filter((o) => o.status === where.status)
            : rows.filter((o) =>
                (where.status as { in: string[] }).in.includes(o.status),
              );
      }
      if (where?.OR) {
        const term = where.OR[0]?.number?.contains ?? '';
        const lower = term.toLowerCase();
        rows = rows.filter(
          (o) =>
            o.number.toLowerCase().includes(lower) ||
            (o.buyer?.name ?? '').toLowerCase().includes(lower),
        );
      }
      return rows.length;
    },
    update: async ({
      where,
      data,
      include,
    }: {
      where: { id: string };
      data: {
        status?: string;
        events?: { create: { type: string; actorId: string; payload: string } };
      };
      include?: unknown;
    }) => {
      void include;
      const order = this.orders.get(where.id);
      if (!order) throw new Error('order not found');
      if (data.status) order.status = data.status;
      if (data.events?.create) {
        order.events.push({
          id: this.nextId('order-event'),
          orderId: order.id,
          createdAt: new Date(),
          ...data.events.create,
        });
      }
      return order;
    },
  };

  readonly orderCounter = {
    findUnique: async ({ where }: { where: { year: number } }) =>
      this.orderCounters.get(where.year) ?? null,
    update: async ({
      where,
      data,
    }: {
      where: { year: number };
      data: { seq: { increment: number } };
    }) => {
      const counter = this.orderCounters.get(where.year);
      if (!counter) throw new Error('counter not found');
      counter.seq += data.seq.increment;
      return counter;
    },
    create: async ({ data }: { data: { year: number; seq: number } }) => {
      this.orderCounters.set(data.year, data);
      return data;
    },
  };

  readonly membership = {
    findFirst: async ({
      where,
    }: {
      where: { userId: string; organizationId: string };
    }) => {
      for (const m of this.memberships.values()) {
        if (
          m.userId === where.userId &&
          m.organizationId === where.organizationId
        ) {
          return m;
        }
      }
      return null;
    },
    // Промт 10, Часть C: получатели уведомлений продавца.
    findMany: async ({
      where,
    }: {
      where: { organizationId?: string; role?: string };
    }) => {
      const result: { userId: string }[] = [];
      for (const m of this.memberships.values()) {
        if (where.organizationId && m.organizationId !== where.organizationId)
          continue;
        if (where.role && m.role !== where.role) continue;
        result.push({ userId: m.userId });
      }
      return result;
    },
  };

  readonly user = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.users.get(where.id) ?? null,
  };

  // Промт 10, Часть C: уведомления (создание внутри транзакций).
  readonly notification = {
    createMany: async ({
      data,
    }: {
      data: Omit<FakeNotification, 'id' | 'createdAt'>[];
    }) => {
      for (const item of data) {
        this.notifications.push({
          id: this.nextId('notif'),
          createdAt: new Date(),
          ...item,
        });
      }
      return { count: data.length };
    },
  };

  /** Эмуляция транзакции: массив — последовательно, функция —
   * снапшот → откат при исключении. */
  $transaction = async (
    operationsOrFn:
      Promise<unknown>[] | ((tx: FakeCartPrisma) => Promise<unknown>),
    _options?: unknown,
  ): Promise<unknown> => {
    if (Array.isArray(operationsOrFn)) {
      return Promise.all(operationsOrFn);
    }
    const fn = operationsOrFn;
    const snapshot = structuredClone({
      offers: [...this.offers],
      carts: [...this.carts],
      cartItems: [...this.cartItems],
      orders: [...this.orders],
      orderCounters: [...this.orderCounters],
      memberships: [...this.memberships],
      notifications: this.notifications,
      stockLocations: [...this.stockLocations],
      stockBalances: [...this.stockBalances],
      stockMovements: [...this.stockMovements],
    });
    try {
      return await fn(this);
    } catch (error) {
      const restore = (
        map: Map<string, unknown>,
        entries: [string, unknown][],
      ) => {
        map.clear();
        for (const [k, v] of entries) map.set(k, v);
      };
      restore(this.offers, snapshot.offers);
      restore(this.carts, snapshot.carts);
      restore(this.cartItems, snapshot.cartItems);
      restore(this.orders, snapshot.orders);
      // Счётчик — Map<number, …>: восстановление без дженерика.
      this.orderCounters.clear();
      for (const [y, v] of snapshot.orderCounters) {
        this.orderCounters.set(y, v);
      }
      restore(this.memberships, snapshot.memberships);
      this.notifications.length = 0;
      this.notifications.push(...snapshot.notifications);
      restore(this.stockLocations, snapshot.stockLocations);
      restore(this.stockBalances, snapshot.stockBalances);
      restore(this.stockMovements, snapshot.stockMovements);
      throw error;
    }
  };
}
