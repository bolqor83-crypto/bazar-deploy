/**
 * Фейковый Prisma для unit-тестов доставок (Промт 10, Часть D).
 *
 * In-memory хранилища Map; $transaction эмулирует откат через
 * structuredClone-снапшот (реальный откат проверяется e2e на Neon).
 * Модель повторяет FakeCartPrisma (Промт 9) с добавлением
 * DeliveryRequest/DeliveryEvent/DeliveryCounter.
 */
export interface FakeDeliveryUser {
  id: string;
  name: string;
}

export interface FakeDeliveryOrg {
  id: string;
  name: string;
}

export interface FakeDeliveryOrder {
  id: string;
  number: string;
  buyerId: string;
  sellerId: string;
  status: string;
  createdAt: Date;
}

export interface FakeDeliveryEvent {
  id: string;
  deliveryId: string;
  type: string;
  actorId: string | null;
  payload: string | null;
  createdAt: Date;
}

export interface FakeDelivery {
  id: string;
  number: string;
  orderId: string;
  requesterId: string;
  carrierOrganizationId: string | null;
  status: string;
  pickupAddress: string;
  pickupContact: string;
  dropoffAddress: string;
  dropoffContact: string;
  weightKg: number | null;
  volumeL: number | null;
  cargoNotes: string | null;
  price: number | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Отношения (включаются в любой find — include у сервиса один).
  order: FakeDeliveryOrder;
  requester: FakeDeliveryUser;
  carrierOrganization: FakeDeliveryOrg | null;
  events: FakeDeliveryEvent[];
}

/** Уведомление (создаётся внутри транзакций сервиса). */
export interface FakeDeliveryNotification {
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

/** Данные create для заявки (вход сервиса, вложенные события). */
export interface FakeDeliveryCreateData {
  number: string;
  orderId: string;
  requesterId: string;
  status: string;
  pickupAddress: string;
  pickupContact: string;
  dropoffAddress: string;
  dropoffContact: string;
  weightKg: number | null;
  volumeL: number | null;
  cargoNotes: string | null;
  events: { create: { type: string; actorId: string; payload: string } };
}

export class FakeDeliveryPrisma {
  readonly users = new Map<string, FakeDeliveryUser>();
  readonly organizations = new Map<string, FakeDeliveryOrg>();
  readonly orders = new Map<string, FakeDeliveryOrder>();
  readonly deliveries = new Map<string, FakeDelivery>();
  readonly deliveryCounters = new Map<number, { year: number; seq: number }>();
  readonly memberships = new Map<
    string,
    { userId: string; organizationId: string; role?: string }
  >();
  /** Уведомления — массив: порядок создания важен для проверок. */
  readonly notifications: FakeDeliveryNotification[] = [];

  private counter = 0;
  nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${String(this.counter).padStart(4, '0')}`;
  }

  /** Связи для записи доставки (по include сервиса). */
  private attach(delivery: FakeDelivery): FakeDelivery {
    const order = this.orders.get(delivery.orderId);
    if (order) {
      delivery.order = order;
    }
    const requester = this.users.get(delivery.requesterId);
    if (requester) {
      delivery.requester = requester;
    }
    delivery.carrierOrganization = delivery.carrierOrganizationId
      ? (this.organizations.get(delivery.carrierOrganizationId) ?? null)
      : null;
    delivery.events = delivery.events
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return delivery;
  }

  readonly order = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.orders.get(where.id) ?? null,
  };

  readonly membership = {
    findFirst: async ({
      where,
    }: {
      where: {
        userId: string;
        organizationId: string;
        role?: string;
      };
    }) => {
      for (const m of this.memberships.values()) {
        if (m.userId !== where.userId) continue;
        if (m.organizationId !== where.organizationId) continue;
        if (where.role && m.role !== where.role) continue;
        return m;
      }
      return null;
    },
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

  readonly notification = {
    createMany: async ({
      data,
    }: {
      data: Omit<FakeDeliveryNotification, 'id' | 'createdAt'>[];
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

  readonly deliveryRequest = {
    findFirst: async ({
      where,
    }: {
      where: {
        orderId?: string;
        status?: { in: string[] };
      };
    }) => {
      for (const d of this.deliveries.values()) {
        if (where.orderId && d.orderId !== where.orderId) continue;
        if (where.status && !where.status.in.includes(d.status)) continue;
        return d;
      }
      return null;
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const d = this.deliveries.get(where.id);
      return d ? this.attach({ ...d, events: [...d.events] }) : null;
    },
    findMany: async ({
      where,
      orderBy,
      skip,
      take,
    }: {
      where?: {
        status?: string;
        carrierOrganizationId?: string;
      };
      orderBy?: unknown;
      skip?: number;
      take?: number;
    }) => {
      void orderBy;
      let rows = [...this.deliveries.values()];
      if (where?.status) {
        rows = rows.filter((d) => d.status === where.status);
      }
      if (where?.carrierOrganizationId) {
        rows = rows.filter(
          (d) => d.carrierOrganizationId === where.carrierOrganizationId,
        );
      }
      rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return rows
        .slice(skip ?? 0, (skip ?? 0) + (take ?? rows.length))
        .map((d) => this.attach({ ...d, events: [...d.events] }));
    },
    count: async ({
      where,
    }: {
      where?: {
        status?: string;
        carrierOrganizationId?: string;
      };
    }) => {
      let rows = [...this.deliveries.values()];
      if (where?.status) {
        rows = rows.filter((d) => d.status === where.status);
      }
      if (where?.carrierOrganizationId) {
        rows = rows.filter(
          (d) => d.carrierOrganizationId === where.carrierOrganizationId,
        );
      }
      return rows.length;
    },
    create: async ({ data }: { data: FakeDeliveryCreateData }) => {
      const order = this.orders.get(data.orderId);
      const requester = this.users.get(data.requesterId);
      const { events, ...rest } = data;
      const record: FakeDelivery = {
        id: this.nextId('delivery'),
        createdAt: new Date(),
        updatedAt: new Date(),
        cancelReason: null,
        price: null,
        carrierOrganizationId: null,
        order: order ?? {
          id: data.orderId,
          number: '',
          buyerId: '',
          sellerId: '',
          status: '',
          createdAt: new Date(),
        },
        requester: requester ?? { id: data.requesterId, name: '' },
        carrierOrganization: null,
        events: [
          {
            id: this.nextId('delivery-event'),
            deliveryId: '',
            createdAt: new Date(),
            ...events.create,
          },
        ],
        ...rest,
      };
      record.events.forEach((e) => (e.deliveryId = record.id));
      this.deliveries.set(record.id, record);
      return this.attach({ ...record, events: [...record.events] });
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: {
        status?: string;
        carrierOrganizationId?: string | null;
        price?: number;
        cancelReason?: string;
        events?: { create: { type: string; actorId: string; payload: string } };
      };
    }) => {
      const d = this.deliveries.get(where.id);
      if (!d) throw new Error('delivery not found');
      if (data.status !== undefined) d.status = data.status;
      if (data.carrierOrganizationId !== undefined)
        d.carrierOrganizationId = data.carrierOrganizationId;
      if (data.price !== undefined) d.price = data.price;
      if (data.cancelReason !== undefined) d.cancelReason = data.cancelReason;
      if (data.events?.create) {
        d.events.push({
          id: this.nextId('delivery-event'),
          deliveryId: d.id,
          createdAt: new Date(),
          ...data.events.create,
        });
      }
      d.updatedAt = new Date();
      return this.attach({ ...d, events: [...d.events] });
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; status?: string };
      data: {
        status?: string;
        carrierOrganizationId?: string;
        price?: number;
      };
    }) => {
      const d = this.deliveries.get(where.id);
      if (!d) return { count: 0 };
      if (where.status && d.status !== where.status) return { count: 0 };
      if (data.status !== undefined) d.status = data.status;
      if (data.carrierOrganizationId !== undefined)
        d.carrierOrganizationId = data.carrierOrganizationId;
      if (data.price !== undefined) d.price = data.price;
      d.updatedAt = new Date();
      return { count: 1 };
    },
  };

  readonly deliveryCounter = {
    findUnique: async ({ where }: { where: { year: number } }) =>
      this.deliveryCounters.get(where.year) ?? null,
    update: async ({
      where,
      data,
    }: {
      where: { year: number };
      data: { seq: { increment: number } };
    }) => {
      const counter = this.deliveryCounters.get(where.year);
      if (!counter) throw new Error('counter not found');
      counter.seq += data.seq.increment;
      return counter;
    },
    create: async ({ data }: { data: { year: number; seq: number } }) => {
      this.deliveryCounters.set(data.year, data);
      return data;
    },
  };

  /** Эмуляция транзакции: снапшот → откат при исключении. */
  $transaction = async (
    // Фейк одновременно играет роль и клиента, и транзакции.
    fn: (tx: FakeDeliveryPrisma) => Promise<unknown>,
    _options?: unknown,
  ): Promise<unknown> => {
    const snapshot = structuredClone({
      users: [...this.users],
      organizations: [...this.organizations],
      orders: [...this.orders],
      deliveries: [...this.deliveries],
      memberships: [...this.memberships],
      notifications: this.notifications,
    });
    const snapshotCounters = [...this.deliveryCounters];
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
      restore(this.users, snapshot.users);
      restore(this.organizations, snapshot.organizations);
      restore(this.orders, snapshot.orders);
      restore(this.deliveries, snapshot.deliveries);
      restore(this.memberships, snapshot.memberships);
      this.deliveryCounters.clear();
      for (const [y, v] of snapshotCounters) {
        this.deliveryCounters.set(y, v);
      }
      this.notifications.length = 0;
      this.notifications.push(...snapshot.notifications);
      throw error;
    }
  };
}
