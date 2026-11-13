/**
 * Фейковый PrismaClient для unit-тестов сервисов API.
 *
 * In-memory хранилища Map с теми же сигнатурами методов, что
 * использует код сервисов. Покрывает только нужные операции —
 * это стаб, а не эмуляция СУБД.
 */
import type { Session, User } from '@prisma/client';

type SessionRecord = Session;
type UserRecord = User;

export class FakePrisma {
  readonly users = new Map<string, UserRecord>();
  readonly sessions = new Map<string, SessionRecord>();
  readonly memberships = new Map<string, Record<string, unknown>>();
  readonly organizations = new Map<string, Record<string, unknown>>();
  readonly locations = new Map<string, Record<string, unknown>>();
  readonly categories = new Map<string, Record<string, unknown>>();
  readonly products = new Map<string, Record<string, unknown>>();
  readonly offers = new Map<string, Record<string, unknown>>();

  /** Счётчик create для авто-идентификаторов. */
  private counter = 0;

  nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${String(this.counter).padStart(4, '0')}`;
  }

  readonly user = {
    findUnique: async ({
      where,
    }: {
      where: { id?: string; phone?: string };
    }) => {
      if (where.id) {
        return this.users.get(where.id) ?? null;
      }
      if (where.phone) {
        for (const user of this.users.values()) {
          if (user.phone === where.phone) {
            return user;
          }
        }
      }
      return null;
    },
    create: async ({
      data,
    }: {
      data: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>;
    }) => {
      const record: UserRecord = {
        id: this.nextId('user'),
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [],
        sessions: [],
        ...data,
      } as UserRecord;
      this.users.set(record.id, record);
      return record;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<UserRecord>;
    }) => {
      const record = this.users.get(where.id);
      if (!record) {
        throw new Error('user not found');
      }
      const updated = { ...record, ...data, updatedAt: new Date() };
      this.users.set(where.id, updated);
      return updated;
    },
  };

  readonly session = {
    findUnique: async ({ where }: { where: { refreshHash: string } }) => {
      for (const session of this.sessions.values()) {
        if (session.refreshHash === where.refreshHash) {
          return session;
        }
      }
      return null;
    },
    create: async ({
      data,
    }: {
      data: Omit<
        SessionRecord,
        'id' | 'createdAt' | 'revokedAt' | 'userAgent' | 'ip'
      > &
        Partial<Pick<SessionRecord, 'revokedAt' | 'userAgent' | 'ip'>>;
    }) => {
      const record: SessionRecord = {
        id: this.nextId('session'),
        createdAt: new Date(),
        // Prisma создаёт колонки со значениями NULL — фейк повторяет.
        revokedAt: null,
        userAgent: null,
        ip: null,
        ...data,
      } as SessionRecord;
      this.sessions.set(record.id, record);
      return record;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<SessionRecord>;
    }) => {
      const record = this.sessions.get(where.id);
      if (!record) {
        throw new Error('session not found');
      }
      const updated = { ...record, ...data };
      this.sessions.set(where.id, updated);
      return updated;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: Record<string, unknown>;
      data: Partial<SessionRecord>;
    }) => {
      let count = 0;
      for (const [id, session] of this.sessions.entries()) {
        const matches = Object.entries(where).every(([key, value]) => {
          if (
            value &&
            typeof value === 'object' &&
            !('in' in (value as object))
          ) {
            return session[key as keyof SessionRecord] === value;
          }
          return session[key as keyof SessionRecord] === value;
        });
        if (matches) {
          this.sessions.set(id, { ...session, ...data });
          count += 1;
        }
      }
      return { count };
    },
  };

  readonly membership = {
    findMany: async ({ where }: { where: { userId?: string } }) => {
      const result: Record<string, unknown>[] = [];
      for (const membership of this.memberships.values()) {
        if (!where.userId || membership.userId === where.userId) {
          result.push({
            ...membership,
            organization: this.organizations.get(
              membership.organizationId as string,
            ),
          });
        }
      }
      return result;
    },
    findFirst: async ({ where }: { where: Record<string, unknown> }) => {
      for (const membership of this.memberships.values()) {
        const matches = Object.entries(where).every(
          ([key, value]) => membership[key] === value,
        );
        if (matches) {
          return membership;
        }
      }
      return null;
    },
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const record = {
        id: this.nextId('membership'),
        createdAt: new Date(),
        ...data,
      };
      this.memberships.set(record.id, record);
      return record;
    },
  };

  readonly organization = {
    create: async ({
      data,
    }: {
      data: Record<string, unknown> & {
        memberships?: { create: Record<string, unknown> };
      };
    }) => {
      const id = this.nextId('org');
      const { memberships, ...rest } = data;
      const record = { id, createdAt: new Date(), ...rest };
      this.organizations.set(id, record);
      if (memberships?.create) {
        await this.membership.create({
          data: { ...memberships.create, organizationId: id },
        });
      }
      return record;
    },
    findUnique: async ({
      where,
      include,
    }: {
      where: { id: string };
      include?: { memberships?: unknown; locations?: unknown };
    }) => {
      const base = this.organizations.get(where.id);
      if (!base) {
        return null;
      }
      if (!include) {
        return base;
      }
      const record: Record<string, unknown> = { ...base };
      if (include.memberships) {
        record.memberships = [...this.memberships.values()]
          .filter((m) => m.organizationId === where.id)
          .map((m) => ({
            ...m,
            user: this.users.get(m.userId as string) ?? null,
          }));
      }
      if (include.locations) {
        record.locations = [...this.locations.values()].filter(
          (l) => l.organizationId === where.id,
        );
      }
      return record;
    },
  };

  readonly businessLocation = {
    findMany: async ({
      where,
    }: {
      where: { organizationId?: string | { in: string[] } };
    }) => {
      const result: Record<string, unknown>[] = [];
      for (const location of this.locations.values()) {
        const filter = where.organizationId;
        const matches =
          !filter ||
          (typeof filter === 'string'
            ? location.organizationId === filter
            : filter.in.includes(location.organizationId as string));
        if (matches) {
          result.push(location);
        }
      }
      return result;
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      return this.locations.get(where.id) ?? null;
    },
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const record = {
        id: this.nextId('loc'),
        createdAt: new Date(),
        ...data,
      };
      this.locations.set(record.id, record);
      return record;
    },
  };

  readonly category = {
    findMany: async ({
      orderBy,
    }: {
      orderBy?: { sortOrder?: 'asc' | 'desc' };
    } = {}) => {
      const all = [...this.categories.values()];
      if (orderBy?.sortOrder === 'desc') {
        all.sort((a, b) => (b.sortOrder as number) - (a.sortOrder as number));
      } else {
        all.sort((a, b) => (a.sortOrder as number) - (b.sortOrder as number));
      }
      return all;
    },
    count: async () => this.categories.size,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const record = {
        id: this.nextId('cat'),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      this.categories.set(record.id, record);
      return record;
    },
  };

  readonly product = {
    findMany: async ({
      where,
      include,
      select,
    }: {
      where?: {
        categoryId?: string;
        category?: { slug: string };
        archivedAt?: null;
      };
      include?: { category?: boolean; offers?: boolean };
      select?: { categoryId?: boolean };
    } = {}) => {
      const result: Record<string, unknown>[] = [];
      for (const product of this.products.values()) {
        if (where?.categoryId && product.categoryId !== where.categoryId) {
          continue;
        }
        if (where?.category) {
          const category = this.categories.get(product.categoryId as string);
          if (!category || category.slug !== where.category.slug) {
            continue;
          }
        }
        // Промт 10: каталог не показывает архивные товары.
        if (where?.archivedAt === null && product.archivedAt) {
          continue;
        }
        if (select?.categoryId) {
          result.push({ categoryId: product.categoryId });
          continue;
        }
        const record: Record<string, unknown> = { ...product };
        if (include?.category) {
          record.category = this.categories.get(product.categoryId as string);
        }
        if (include?.offers) {
          record.offers = [...this.offers.values()]
            .filter((o) => o.productId === product.id)
            .map((o) => ({
              ...o,
              organization: this.organizations.get(o.organizationId as string),
            }));
        }
        result.push(record);
      }
      return result;
    },
    findUnique: async ({
      where,
      include,
    }: {
      where: { id: string };
      include?: { category?: boolean; offers?: boolean };
    }) => {
      const product = this.products.get(where.id);
      if (!product) {
        return null;
      }
      const record: Record<string, unknown> = { ...product };
      if (include?.category) {
        record.category = this.categories.get(product.categoryId as string);
      }
      if (include?.offers) {
        record.offers = [...this.offers.values()]
          .filter((o) => o.productId === product.id)
          .map((o) => ({
            ...o,
            organization: this.organizations.get(o.organizationId as string),
          }));
      }
      return record;
    },
    count: async () => this.products.size,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const record = {
        id: this.nextId('prod'),
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      this.products.set(record.id, record);
      return record;
    },
  };

  readonly productOffer = {
    findMany: async ({
      where,
    }: {
      where?: { productId?: string; organizationId?: string };
    } = {}) => {
      const result: Record<string, unknown>[] = [];
      for (const offer of this.offers.values()) {
        if (where?.productId && offer.productId !== where.productId) {
          continue;
        }
        if (
          where?.organizationId &&
          offer.organizationId !== where.organizationId
        ) {
          continue;
        }
        result.push(offer);
      }
      return result;
    },
    count: async () => this.offers.size,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const record = {
        id: this.nextId('offer'),
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      this.offers.set(record.id, record);
      return record;
    },
  };

  /** Транзакция-массив: выполняем последовательно. */
  $transaction(operations: Promise<unknown>[]): Promise<unknown[]> {
    return Promise.all(operations);
  }
}
