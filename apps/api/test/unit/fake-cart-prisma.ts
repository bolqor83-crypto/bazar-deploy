/**
 * Фейковый Prisma для unit-тестов корзины и заказов (Промт 9).
 *
 * In-memory хранилища Map; $transaction эмулирует откат через
 * structuredClone-снапшот (реальный откат проверяется e2e на Neon).
 */
export interface FakeOffer {
  id: string;
  productId: string;
  organizationId: string;
  priceKopecks: number;
  stock: number;
  minQuantity: number;
  badge: string | null;
  isPerishable: boolean;
  product: { id: string; name: string; unit: string };
  organization: { id: string; name: string };
}

export interface FakeCartItem {
  id: string;
  cartId: string;
  offerId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  offer: FakeOffer;
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
}

export class FakeCartPrisma {
  readonly offers = new Map<string, FakeOffer>();
  readonly carts = new Map<string, FakeCart>();
  readonly cartItems = new Map<string, FakeCartItem>();
  readonly orders = new Map<string, FakeOrder>();
  readonly orderCounters = new Map<number, { year: number; seq: number }>();
  readonly memberships = new Map<
    string,
    { userId: string; organizationId: string }
  >();

  private counter = 0;
  nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${String(this.counter).padStart(4, '0')}`;
  }

  readonly productOffer = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.offers.get(where.id) ?? null,
    findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in
        .map((id) => this.offers.get(id))
        .filter((o): o is FakeOffer => !!o),
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; stock?: { gte: number } };
      data: { stock: { decrement: number } };
    }) => {
      const offer = this.offers.get(where.id);
      if (!offer) return { count: 0 };
      if (where.stock?.gte !== undefined && offer.stock < where.stock.gte) {
        return { count: 0 };
      }
      offer.stock -= data.stock.decrement;
      return { count: 1 };
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { stock: { increment: number } };
    }) => {
      const offer = this.offers.get(where.id);
      if (!offer) throw new Error('offer not found');
      offer.stock += data.stock.increment;
      return offer;
    },
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

  readonly cartItem = {
    findUnique: async ({
      where,
    }: {
      where: { id: string };
      include?: unknown;
      select?: unknown;
    }) => {
      const item = this.cartItems.get(where.id);
      if (!item) return null;
      const cart = [...this.carts.values()].find((c) => c.id === item.cartId);
      return {
        ...item,
        offer: item.offer,
        cart: { userId: cart?.userId },
      };
    },
    findMany: async ({
      where,
      orderBy,
    }: {
      where: { cartId: string };
      orderBy?: unknown;
    }) => {
      void orderBy;
      const items = [...this.cartItems.values()]
        .filter((i) => i.cartId === where.cartId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      return items;
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
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { quantity: number };
    }) => {
      const item = this.cartItems.get(where.id);
      if (!item) throw new Error('cart item not found');
      item.quantity = data.quantity;
      return item;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      this.cartItems.delete(where.id);
      return null;
    },
    deleteMany: async ({ where }: { where: { cartId: string } }) => {
      let count = 0;
      for (const [id, item] of this.cartItems) {
        if (item.cartId === where.cartId) {
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
      };
      record.items.forEach((i) => (i.orderId = record.id));
      record.events.forEach((e) => (e.orderId = record.id));
      this.orders.set(record.id, record);
      return record;
    },
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.orders.get(where.id) ?? null,
    findMany: async ({
      where,
      orderBy,
      skip,
      take,
    }: {
      where?: { buyerId?: string; status?: string };
      orderBy?: unknown;
      skip?: number;
      take?: number;
    }) => {
      void orderBy;
      let rows = [...this.orders.values()];
      if (where?.buyerId)
        rows = rows.filter((o) => o.buyerId === where.buyerId);
      if (where?.status) rows = rows.filter((o) => o.status === where.status);
      return rows.slice(skip ?? 0, (skip ?? 0) + (take ?? rows.length));
    },
    count: async ({
      where,
    }: {
      where?: { buyerId?: string; status?: string };
    }) => {
      let rows = [...this.orders.values()];
      if (where?.buyerId)
        rows = rows.filter((o) => o.buyerId === where.buyerId);
      if (where?.status) rows = rows.filter((o) => o.status === where.status);
      return rows.length;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: {
        status?: string;
        events?: { create: { type: string; actorId: string; payload: string } };
      };
    }) => {
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
  };

  /** Эмуляция транзакции: снапшот → откат при исключении. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $transaction = async (
    fn: (tx: any) => Promise<unknown>,
    _options?: unknown,
  ) => {
    const snapshot = structuredClone({
      offers: [...this.offers],
      carts: [...this.carts],
      cartItems: [...this.cartItems],
      orders: [...this.orders],
      orderCounters: [...this.orderCounters],
      memberships: [...this.memberships],
    });
    try {
      return await fn(this);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const restore = (map: any, entries: any) => {
        map.clear();
        for (const [k, v] of entries) map.set(k, v);
      };
      restore(this.offers, snapshot.offers);
      restore(this.carts, snapshot.carts);
      restore(this.cartItems, snapshot.cartItems);
      restore(this.orders, snapshot.orders);
      restore(this.orderCounters, snapshot.orderCounters);
      restore(this.memberships, snapshot.memberships);
      throw error;
    }
  };
}
