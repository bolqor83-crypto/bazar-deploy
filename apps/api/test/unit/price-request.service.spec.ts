/**
 * Unit-тесты PriceRequestService (Промт 16, Часть C): создание
 * запроса на POR-оффер, идемпотентность PENDING, ответ продавца
 * (72 часа), отклонение, изоляция покупателей, вычисляемое
 * истечение, валидация quote для корзины.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  PriceRequestService,
  isExpired,
  PRICE_REQUEST_VALIDITY_HOURS,
} from '../../src/price-requests/price-request.service';
import type { PrismaService } from '../../src/prisma/prisma.service';

/** Минимальный мир: офферы, запросы, членства, уведомления. */
class FakePrisma {
  offers = new Map<
    string,
    {
      id: string;
      organizationId: string;
      organization: { id: string; name: string };
      priceKopecks: number;
      priceOnRequest: boolean;
      minQuantity: number;
      archivedAt: Date | null;
      product: { id: string; name: string; unit: string };
    }
  >();
  priceRequests = new Map<
    string,
    {
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
  >();
  users = new Map<string, { id: string; name: string }>();
  memberships: { userId: string; organizationId: string; role: string }[] = [];
  notifications: {
    userId: string;
    type: string;
    title: string;
    body: string;
    payload: string;
    orderId: string | null;
  }[] = [];

  private counter = 0;
  private nextId(): string {
    this.counter += 1;
    return `pr-${String(this.counter).padStart(4, '0')}`;
  }

  productOffer = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.offers.get(where.id) ?? null,
  };

  user = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.users.get(where.id) ?? null,
  };

  membership = {
    findMany: async ({ where }: { where: { organizationId: string } }) =>
      this.memberships.filter((m) => m.organizationId === where.organizationId),
    findFirst: async ({
      where,
    }: {
      where: { userId: string; organizationId: string };
    }) =>
      this.memberships.find(
        (m) =>
          m.userId === where.userId &&
          m.organizationId === where.organizationId,
      ) ?? null,
  };

  notification = {
    createMany: async ({ data }: { data: unknown[] }) => {
      for (const row of data as Record<string, unknown>[]) {
        this.notifications.push(row as never);
      }
      return { count: data.length };
    },
  };

  priceRequest = {
    findFirst: async ({
      where,
      include,
    }: {
      where: { buyerId: string; offerId: string; status: string };
      include?: { offer?: unknown };
    }) => {
      const found = [...this.priceRequests.values()].find(
        (r) =>
          r.buyerId === where.buyerId &&
          r.offerId === where.offerId &&
          r.status === where.status,
      );
      return found ? this.withInclude(found, include) : null;
    },
    findUnique: async ({
      where,
      include,
    }: {
      where: { id: string };
      include?: { offer?: unknown };
    }) => {
      const found = this.priceRequests.get(where.id) ?? null;
      return found ? this.withInclude(found, include) : null;
    },
    findMany: async ({
      where,
      orderBy,
      include,
    }: {
      where: {
        buyerId?: string;
        status?: string;
        offer?: { organizationId: string };
      };
      orderBy?: unknown;
      include?: { offer?: unknown };
    }) => {
      void orderBy;
      const rows = [...this.priceRequests.values()]
        .filter((r) => {
          if (where.buyerId && r.buyerId !== where.buyerId) return false;
          if (where.status && r.status !== where.status) return false;
          if (
            where.offer &&
            this.offers.get(r.offerId)?.organizationId !==
              where.offer.organizationId
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      return rows.map((row) => this.withInclude(row, include));
    },
    count: async ({
      where,
    }: {
      where: {
        buyerId?: string;
        status?: string;
        offer?: { organizationId: string };
      };
    }) =>
      [...this.priceRequests.values()].filter((r) => {
        if (where.buyerId && r.buyerId !== where.buyerId) return false;
        if (where.status && r.status !== where.status) return false;
        if (
          where.offer &&
          this.offers.get(r.offerId)?.organizationId !==
            where.offer.organizationId
        ) {
          return false;
        }
        return true;
      }).length,
    create: async ({
      data,
      include,
    }: {
      data: Record<string, unknown>;
      include?: { offer?: unknown };
    }) => {
      const record = {
        id: this.nextId(),
        status: 'PENDING' as const,
        quotedPriceKopecks: null,
        validUntil: null,
        respondedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      } as typeof this.priceRequests extends Map<string, infer V> ? V : never;
      this.priceRequests.set(record.id, record);
      return this.withInclude(record, include);
    },
    update: async ({
      where,
      data,
      include,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
      include?: { offer?: unknown };
    }) => {
      const record = this.priceRequests.get(where.id);
      if (!record) throw new Error('price request not found');
      Object.assign(record, data, { updatedAt: new Date() });
      return this.withInclude(record, include);
    },
  };

  /** Подключение оффера/покупателя при include (как Prisma include). */
  private withInclude<T extends { offerId: string; buyerId?: string }>(
    record: T,
    include?: { offer?: unknown; buyer?: unknown },
  ): T & { offer?: unknown; buyer?: unknown } {
    const result: T & { offer?: unknown; buyer?: unknown } = { ...record };
    if (include?.offer) {
      result.offer = this.offers.get(record.offerId) ?? null;
    }
    if (include?.buyer && record.buyerId) {
      result.buyer = this.users.get(record.buyerId) ?? null;
    }
    return result;
  }

  $transaction = async (fn: (tx: unknown) => Promise<unknown>) => fn(this);
}

describe('PriceRequestService (unit)', () => {
  let service: PriceRequestService;
  let prisma: FakePrisma;

  const BUYER = 'buyer-1';
  const OTHER_BUYER = 'buyer-2';
  const SELLER_USER = 'seller-user-1';
  const ORG = 'org-1';
  const POR_OFFER = 'offer-por';
  const OPEN_OFFER = 'offer-open';

  beforeEach(() => {
    prisma = new FakePrisma();
    service = new PriceRequestService(prisma as unknown as PrismaService);

    prisma.offers.set(POR_OFFER, {
      id: POR_OFFER,
      organizationId: ORG,
      organization: { id: ORG, name: 'Опт-Юг' },
      priceKopecks: 25000,
      priceOnRequest: true,
      minQuantity: 10,
      archivedAt: null,
      product: { id: 'product-1', name: 'Картофель молодой', unit: '1 кг' },
    });
    prisma.offers.set(OPEN_OFFER, {
      id: OPEN_OFFER,
      organizationId: ORG,
      organization: { id: ORG, name: 'Опт-Юг' },
      priceKopecks: 18900,
      priceOnRequest: false,
      minQuantity: 5,
      archivedAt: null,
      product: { id: 'product-2', name: 'Помидоры розовые', unit: '1 кг' },
    });
    prisma.users.set(BUYER, { id: BUYER, name: 'Иван Петров' });
    prisma.users.set(SELLER_USER, { id: SELLER_USER, name: 'Опт-Юг Менеджер' });
    prisma.memberships.push({
      userId: SELLER_USER,
      organizationId: ORG,
      role: 'WHOLESALE_SELLER',
    });
  });

  describe('create', () => {
    it('создаёт PENDING-запрос на POR-оффер и уведомляет продавца', async () => {
      const request = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
        message: 'Нужна отгрузка до пятницы',
      });
      expect(request.status).toBe('PENDING');
      expect(request.message).toBe('Нужна отгрузка до пятницы');
      // Базовая цена не покидает сервер (вид для покупателя).
      expect(request.offer.priceKopecks).toBeNull();
      expect(request.offer.priceOnRequest).toBe(true);
      // Уведомление членам организации-продавца.
      expect(prisma.notifications).toHaveLength(1);
      expect(prisma.notifications[0].type).toBe('PRICE_REQUEST_CREATED');
      expect(prisma.notifications[0].userId).toBe(SELLER_USER);
    });

    it('идемпотентность: живой PENDING на ту же пару возвращается', async () => {
      const first = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
      });
      const second = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 70,
      });
      expect(second.id).toBe(first.id);
      expect(prisma.priceRequests.size).toBe(1);
    });

    it('открытая цена — запрос не нужен (400)', async () => {
      await expect(
        service.create(BUYER, { offerId: OPEN_OFFER, quantity: 10 }),
      ).rejects.toMatchObject({
        response: { code: 'PRICE_REQUEST_NOT_ALLOWED' },
      });
    });

    it('ниже minQuantity — 400', async () => {
      await expect(
        service.create(BUYER, { offerId: POR_OFFER, quantity: 5 }),
      ).rejects.toMatchObject({
        response: { code: 'BELOW_MIN_QUANTITY' },
      });
    });

    it('несуществующий оффер — 404', async () => {
      await expect(
        service.create(BUYER, { offerId: 'nope', quantity: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('пустое сообщение — null (не пустая строка)', async () => {
      const request = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
        message: '   ',
      });
      expect(request.message).toBeNull();
    });
  });

  describe('respond', () => {
    it('переводит в ANSWERED со сроком 72 часа и уведомляет покупателя', async () => {
      const request = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
      });
      const before = Date.now();
      const answered = await service.respond(
        { userId: SELLER_USER, organizationId: ORG },
        request.id,
        22000,
      );
      expect(answered.status).toBe('ANSWERED');
      expect(answered.quotedPriceKopecks).toBe(22000);
      expect(answered.validUntil).not.toBeNull();
      const hours =
        ((answered.validUntil as Date).getTime() - before) / 3_600_000;
      expect(hours).toBeGreaterThanOrEqual(PRICE_REQUEST_VALIDITY_HOURS - 0.1);
      expect(hours).toBeLessThanOrEqual(PRICE_REQUEST_VALIDITY_HOURS + 0.1);
      expect(answered.expired).toBe(false);
      // Уведомление покупателю.
      const notify = prisma.notifications.find(
        (n) => n.type === 'PRICE_REQUEST_ANSWERED',
      );
      expect(notify?.userId).toBe(BUYER);
    });

    it('чужая организация — 404 (изоляция)', async () => {
      const request = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
      });
      await expect(
        service.respond(
          { userId: SELLER_USER, organizationId: 'org-other' },
          request.id,
          22000,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('повторный ответ — 400 (редактирование недоступно)', async () => {
      const request = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
      });
      await service.respond(
        { userId: SELLER_USER, organizationId: ORG },
        request.id,
        22000,
      );
      await expect(
        service.respond(
          { userId: SELLER_USER, organizationId: ORG },
          request.id,
          23000,
        ),
      ).rejects.toMatchObject({
        response: { code: 'PRICE_REQUEST_ALREADY_ANSWERED' },
      });
    });
  });

  describe('decline', () => {
    it('переводит в DECLINED и уведомляет покупателя', async () => {
      const request = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
      });
      const declined = await service.decline(
        { userId: SELLER_USER, organizationId: ORG },
        request.id,
        'Нет объема',
      );
      expect(declined.status).toBe('DECLINED');
      const notify = prisma.notifications.find(
        (n) => n.type === 'PRICE_REQUEST_DECLINED',
      );
      expect(notify?.body).toContain('Нет объема');
    });
  });

  describe('detail (изоляция)', () => {
    it('покупатель видит свой запрос', async () => {
      const request = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
      });
      const view = await service.detail(BUYER, request.id);
      expect(view.id).toBe(request.id);
    });

    it('чужой покупатель — 404', async () => {
      const request = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
      });
      await expect(
        service.detail(OTHER_BUYER, request.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('продавец организации видит запрос', async () => {
      const request = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
      });
      const view = await service.detail(SELLER_USER, request.id);
      expect(view.id).toBe(request.id);
    });
  });

  describe('isExpired (вычисляемое истечение)', () => {
    it('не истёк: ANSWERED и validUntil в будущем', () => {
      expect(
        isExpired({
          status: 'ANSWERED',
          validUntil: new Date(Date.now() + 3_600_000),
        }),
      ).toBe(false);
    });

    it('истёк: ANSWERED и validUntil в прошлом', () => {
      expect(
        isExpired({
          status: 'ANSWERED',
          validUntil: new Date(Date.now() - 1_000),
        }),
      ).toBe(true);
    });

    it('PENDING/DECLINED не истекают (нет предложения)', () => {
      expect(isExpired({ status: 'PENDING', validUntil: null })).toBe(false);
      expect(isExpired({ status: 'DECLINED', validUntil: null })).toBe(false);
    });
  });

  describe('usableQuote (валидация для корзины)', () => {
    it('живой ANSWERED проходит', async () => {
      const request = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
      });
      await service.respond(
        { userId: SELLER_USER, organizationId: ORG },
        request.id,
        22000,
      );
      const quote = await service.usableQuote(BUYER, POR_OFFER, request.id);
      expect(quote.quotedPriceKopecks).toBe(22000);
    });

    it('чужой запрос — 404', async () => {
      const request = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
      });
      await expect(
        service.usableQuote(OTHER_BUYER, POR_OFFER, request.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('PENDING — 400 NOT_ANSWERED', async () => {
      const request = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
      });
      await expect(
        service.usableQuote(BUYER, POR_OFFER, request.id),
      ).rejects.toMatchObject({
        response: { code: 'PRICE_REQUEST_NOT_ANSWERED' },
      });
    });

    it('истёкший — 400 EXPIRED', async () => {
      const request = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
      });
      await service.respond(
        { userId: SELLER_USER, organizationId: ORG },
        request.id,
        22000,
      );
      // Сдвигаем срок в прошлое (вычисляемое истечение, без cron).
      const row = prisma.priceRequests.get(request.id);
      if (row) {
        row.validUntil = new Date(Date.now() - 1_000);
      }
      await expect(
        service.usableQuote(BUYER, POR_OFFER, request.id),
      ).rejects.toMatchObject({
        response: { code: 'PRICE_REQUEST_EXPIRED' },
      });
    });

    it('offerId не совпадает — 400 MISMATCH', async () => {
      const request = await service.create(BUYER, {
        offerId: POR_OFFER,
        quantity: 50,
      });
      await service.respond(
        { userId: SELLER_USER, organizationId: ORG },
        request.id,
        22000,
      );
      await expect(
        service.usableQuote(BUYER, OPEN_OFFER, request.id),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('listIncoming', () => {
    it('только запросы на офферы организации', async () => {
      await service.create(BUYER, { offerId: POR_OFFER, quantity: 50 });
      const incoming = await service.listIncoming(ORG, {});
      expect(incoming.items).toHaveLength(1);
      expect(incoming.items[0].buyer?.name).toBe('Иван Петров');
      // Продавец видит базовую цену оффера.
      expect(incoming.items[0].offer.priceKopecks).toBe(25000);
    });
  });
});

describe('PriceRequestController (source-контракт, Промт 16, C)', () => {
  const source = readFileSync(
    resolve(__dirname, '../../src/price-requests/price-request.controller.ts'),
    'utf8',
  );

  it('создание запроса — throttle 10/мин (защита продавца от спама)', () => {
    // Блок @Post() ... @Throttle между декораторами создания.
    const createBlock = source.slice(
      source.indexOf('@Post()'),
      source.indexOf('@Get()'),
    );
    expect(createBlock).toContain(
      '@Throttle({ default: { limit: 10, ttl: 60_000 } })',
    );
  });

  it('маршруты продавца за SellerMembershipGuard', () => {
    const incomingBlock = source.slice(
      source.indexOf("@Get('incoming')"),
      source.indexOf("@Get(':id')"),
    );
    expect(incomingBlock).toContain('SellerMembershipGuard');
    const respondBlock = source.slice(
      source.indexOf("@Post(':id/respond')"),
      source.indexOf("@Post(':id/decline')"),
    );
    expect(respondBlock).toContain('SellerMembershipGuard');
  });
});
