/**
 * Сервис запросов цены «по запросу» (Промт 16, Часть C — ADR 0016).
 *
 * Инварианты:
 * - запрос создаётся ТОЛЬКО на оффер с priceOnRequest (открытая
 *   цена не требует персонального предложения);
 * - один PENDING-запрос на пару (buyer, offer) — повторное
 *   создание возвращает существующий (идемпотентность);
 * - ответ продавца действует 72 часа (validUntil); истечение
 *   вычисляемое (ANSWERED && validUntil < now) — без cron;
 * - продление/редактирование недоступны — новый запрос;
 * - изоляция: покупатель A не видит запросы покупателя B (404),
 *   продавец видит запросы на офферы своей организации;
 * - базовая цена POR-оффера не покидает сервер: в виде для
 *   покупателя priceKopecks всегда null.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, PriceRequest as PriceRequestRow } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { notifyPriceRequestEvent } from '../notifications/notify.helper';

/** Срок действия персонального предложения, часы (ADR 0016). */
export const PRICE_REQUEST_VALIDITY_HOURS = 72;

/** Статусы запроса (enum PriceRequestStatus). */
export const PRICE_REQUEST_STATUSES = [
  'PENDING',
  'ANSWERED',
  'DECLINED',
] as const;
export type PriceRequestStatus = (typeof PRICE_REQUEST_STATUSES)[number];

/** include для вида запроса (оффер + товар + организация). */
const includeOffer = {
  offer: {
    select: {
      id: true,
      priceKopecks: true,
      priceOnRequest: true,
      minQuantity: true,
      archivedAt: true,
      product: { select: { id: true, name: true, unit: true } },
      organization: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.PriceRequestInclude;

type PriceRequestWithOffer = Prisma.PriceRequestGetPayload<{
  include: typeof includeOffer;
}>;

/** Истёк ли срок персонального предложения (вычисляемое). */
export function isExpired(request: {
  status: string;
  validUntil: Date | null;
}): boolean {
  return (
    request.status === 'ANSWERED' &&
    request.validUntil !== null &&
    request.validUntil.getTime() < Date.now()
  );
}

/** Вид запроса для покупателя: базовой цены нет. */
export interface PriceRequestView {
  id: string;
  offerId: string;
  quantity: number;
  message: string | null;
  status: PriceRequestStatus;
  quotedPriceKopecks: number | null;
  validUntil: Date | null;
  expired: boolean;
  respondedAt: Date | null;
  createdAt: Date;
  offer: {
    id: string;
    priceKopecks: number | null;
    priceOnRequest: boolean;
    minQuantity: number;
    product: { id: string; name: string; unit: string };
    organization: { id: string; name: string };
  };
}

/** Вид для продавца: + покупатель и базовая цена. */
export interface PriceRequestSellerView extends PriceRequestView {
  buyer: { id: string; name: string } | null;
}

/** Приведение к виду (без покупателя — для покупателя). */
function toView(request: PriceRequestWithOffer): PriceRequestView {
  return toBaseView(request, false);
}

/** Приведение к виду для продавца: базовая цена оффера видна
 * (это его цена — как в кабинете предложений). */
function toSellerView(request: PriceRequestWithOffer): PriceRequestView {
  return toBaseView(request, true);
}

/** Общее приведение: keepBasePrice — не маскировать базовую цену
 * (вид продавца). */
function toBaseView(
  request: PriceRequestWithOffer,
  keepBasePrice: boolean,
): PriceRequestView {
  return {
    id: request.id,
    offerId: request.offerId,
    quantity: request.quantity,
    message: request.message,
    status: request.status,
    quotedPriceKopecks: request.quotedPriceKopecks,
    validUntil: request.validUntil,
    expired: isExpired(request),
    respondedAt: request.respondedAt,
    createdAt: request.createdAt,
    offer: {
      id: request.offer.id,
      // Базовая цена POR-оффера не покидает сервер (Промт 16, C) —
      // кроме вида продавца (его собственная цена).
      priceKopecks:
        !keepBasePrice && request.offer.priceOnRequest
          ? null
          : request.offer.priceKopecks,
      priceOnRequest: request.offer.priceOnRequest,
      minQuantity: request.offer.minQuantity,
      product: request.offer.product,
      organization: request.offer.organization,
    },
  };
}

@Injectable()
export class PriceRequestService {
  constructor(private readonly prisma: PrismaService) {}

  /** Создать запрос (идемпотентно по PENDING на пару buyer+offer). */
  async create(
    buyerId: string,
    dto: { offerId: string; quantity: number; message?: string },
  ): Promise<PriceRequestView> {
    const offer = await this.prisma.productOffer.findUnique({
      where: { id: dto.offerId },
      select: {
        id: true,
        organizationId: true,
        priceOnRequest: true,
        minQuantity: true,
        archivedAt: true,
        product: { select: { name: true } },
      },
    });
    if (!offer || offer.archivedAt) {
      throw new NotFoundException({
        code: 'OFFER_NOT_FOUND',
        message: 'Предложение не найдено',
      });
    }
    if (!offer.priceOnRequest) {
      throw new BadRequestException({
        code: 'PRICE_REQUEST_NOT_ALLOWED',
        message: 'Цена этого предложения открыта — запрос не нужен',
      });
    }
    if (dto.quantity < offer.minQuantity) {
      throw new BadRequestException({
        code: 'BELOW_MIN_QUANTITY',
        message: `Минимальная партия — ${offer.minQuantity}`,
      });
    }

    // Идемпотентность: живой PENDING на ту же пару — вернуть его.
    const existing = await this.prisma.priceRequest.findFirst({
      where: { buyerId, offerId: dto.offerId, status: 'PENDING' },
      include: includeOffer,
    });
    if (existing) {
      return toView(existing);
    }

    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { name: true },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.priceRequest.create({
        data: {
          buyerId,
          offerId: dto.offerId,
          quantity: dto.quantity,
          message: dto.message?.trim() ? dto.message.trim() : null,
        },
        include: includeOffer,
      });
      // Уведомить продавцов организации (Промт 16, C).
      const members = await tx.membership.findMany({
        where: {
          organizationId: offer.organizationId,
          role: 'WHOLESALE_SELLER',
        },
        select: { userId: true },
      });
      await notifyPriceRequestEvent(tx, {
        userIds: members.map((m) => m.userId),
        type: 'PRICE_REQUEST_CREATED',
        title: 'Запрос цены',
        body: `Покупатель ${buyer?.name ?? '—'} просит цену на «${offer.product.name}» (${dto.quantity} шт.).`,
        priceRequestId: row.id,
        offerId: offer.id,
        extra: { quantity: dto.quantity, productId: productIdOf(row) },
      });
      return row;
    });

    return toView(created);
  }

  /** Мои запросы (покупатель): новые первыми. */
  async listMine(
    buyerId: string,
    filter: { status?: string; page?: number; pageSize?: number },
  ): Promise<{
    items: PriceRequestView[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const where: Prisma.PriceRequestWhereInput = { buyerId };
    if (filter.status && isValidStatus(filter.status)) {
      where.status = filter.status;
    }
    const [rows, total] = await Promise.all([
      this.prisma.priceRequest.findMany({
        where,
        include: includeOffer,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.priceRequest.count({ where }),
    ]);
    return {
      items: rows.map(toView),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  /** Входящие запросы (продавец организации): новые первыми. */
  async listIncoming(
    organizationId: string,
    filter: { status?: string; page?: number; pageSize?: number },
  ): Promise<{
    items: PriceRequestSellerView[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const where: Prisma.PriceRequestWhereInput = {
      offer: { organizationId },
    };
    if (filter.status && isValidStatus(filter.status)) {
      where.status = filter.status;
    }
    const [rows, total] = await Promise.all([
      this.prisma.priceRequest.findMany({
        where,
        include: {
          ...includeOffer,
          buyer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.priceRequest.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        ...toSellerView(row),
        buyer: row.buyer,
      })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  /** Деталь: покупатель (свой) или продавец организации оффера. */
  async detail(userId: string, id: string): Promise<PriceRequestView> {
    const request = await this.prisma.priceRequest.findUnique({
      where: { id },
      include: includeOffer,
    });
    if (!request) {
      throw new NotFoundException({
        code: 'PRICE_REQUEST_NOT_FOUND',
        message: 'Запрос цены не найден',
      });
    }
    if (request.buyerId === userId) {
      return toView(request);
    }
    // Продавец? Членство в организации оффера.
    const member = await this.prisma.membership.findFirst({
      where: {
        userId,
        organizationId: request.offer.organization.id,
      },
      select: { id: true },
    });
    if (!member) {
      // Изоляция: чужой запрос не существует (404, не 403).
      throw new NotFoundException({
        code: 'PRICE_REQUEST_NOT_FOUND',
        message: 'Запрос цены не найден',
      });
    }
    return toView(request);
  }

  /** Ответить ценой (продавец): PENDING → ANSWERED, 72 часа. */
  async respond(
    ctx: { userId: string; organizationId: string },
    id: string,
    priceKopecks: number,
  ): Promise<PriceRequestView> {
    const request = await this.prisma.priceRequest.findUnique({
      where: { id },
      include: includeOffer,
    });
    if (!request || request.offer.organization.id !== ctx.organizationId) {
      throw new NotFoundException({
        code: 'PRICE_REQUEST_NOT_FOUND',
        message: 'Запрос цены не найден',
      });
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException({
        code: 'PRICE_REQUEST_ALREADY_ANSWERED',
        message: 'Запрос уже обработан — создайте новый после ответа',
      });
    }

    const now = new Date();
    const validUntil = new Date(
      now.getTime() + PRICE_REQUEST_VALIDITY_HOURS * 3_600_000,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.priceRequest.update({
        where: { id },
        data: {
          status: 'ANSWERED',
          quotedPriceKopecks: priceKopecks,
          validUntil,
          respondedAt: now,
        },
        include: includeOffer,
      });
      await notifyPriceRequestEvent(tx, {
        userIds: [request.buyerId],
        type: 'PRICE_REQUEST_ANSWERED',
        title: 'Продавец ответил на запрос цены',
        body: `«${request.offer.product.name}»: персональная цена действует 72 часа — до ${formatDateTime(validUntil)}.`,
        priceRequestId: request.id,
        offerId: request.offerId,
        extra: {
          quotedPriceKopecks: priceKopecks,
          productId: request.offer.product.id,
        },
      });
      return row;
    });

    return toView(updated);
  }

  /** Отклонить запрос (продавец): PENDING → DECLINED. */
  async decline(
    ctx: { userId: string; organizationId: string },
    id: string,
    reason?: string,
  ): Promise<PriceRequestView> {
    const request = await this.prisma.priceRequest.findUnique({
      where: { id },
      include: includeOffer,
    });
    if (!request || request.offer.organization.id !== ctx.organizationId) {
      throw new NotFoundException({
        code: 'PRICE_REQUEST_NOT_FOUND',
        message: 'Запрос цены не найден',
      });
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException({
        code: 'PRICE_REQUEST_ALREADY_ANSWERED',
        message: 'Запрос уже обработан — создайте новый после ответа',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.priceRequest.update({
        where: { id },
        data: { status: 'DECLINED' },
        include: includeOffer,
      });
      await notifyPriceRequestEvent(tx, {
        userIds: [request.buyerId],
        type: 'PRICE_REQUEST_DECLINED',
        title: 'Запрос цены отклонён',
        body: `Продавец не смог предложить цену на «${request.offer.product.name}»${reason?.trim() ? `: ${reason.trim()}` : '.'}`,
        priceRequestId: request.id,
        offerId: request.offerId,
        extra: { productId: request.offer.product.id },
      });
      return row;
    });

    return toView(updated);
  }

  /**
   * Валидация персонального предложения для корзины/заказа:
   * запрос покупателя, ANSWERED, не истёк, оффер совпадает.
   */
  async usableQuote(
    buyerId: string,
    offerId: string,
    priceRequestId: string,
  ): Promise<PriceRequestRow> {
    const request = await this.prisma.priceRequest.findUnique({
      where: { id: priceRequestId },
    });
    if (!request || request.buyerId !== buyerId) {
      throw new NotFoundException({
        code: 'PRICE_REQUEST_NOT_FOUND',
        message: 'Персональное предложение не найдено',
      });
    }
    if (request.offerId !== offerId) {
      throw new BadRequestException({
        code: 'PRICE_REQUEST_MISMATCH',
        message: 'Предложение относится к другому товару',
      });
    }
    if (request.status !== 'ANSWERED') {
      throw new BadRequestException({
        code: 'PRICE_REQUEST_NOT_ANSWERED',
        message: 'Продавец ещё не ответил на запрос',
      });
    }
    if (isExpired(request)) {
      throw new BadRequestException({
        code: 'PRICE_REQUEST_EXPIRED',
        message: 'Срок персональной цены истёк — создайте новый запрос',
      });
    }
    return request;
  }
}

/** Валидный статус из строки запроса. */
function isValidStatus(value: string): value is PriceRequestStatus {
  return (PRICE_REQUEST_STATUSES as readonly string[]).includes(value);
}

/** id товара из включённого оффера (для payload уведомления). */
function productIdOf(row: PriceRequestWithOffer): string {
  return row.offer.product.id;
}

/** Дата-время для текста уведомления (ru, без секунд). */
function formatDateTime(date: Date): string {
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
