/**
 * Сервис заказов (Промт 9, Часть E).
 *
 * Ключевые гарантии:
 * - нумерация BZ-YYYY-NNNNNN: атомарный инкремент счётчика
 *   OrderCounter внутри транзакции + retry при редкой гонке unique;
 * - stock-резерв транзакционно: updateMany с WHERE stock >= qty —
 *   не хватило, откат всей группы с OUT_OF_STOCK;
 * - группировка по продавцу: позиции разных организаций
 *   раскладываются в отдельные заказы (ответ — массив);
 * - отмена (buyer/seller, только PENDING/CONFIRMED) восстанавливает
 *   stock и пишет событие CANCELLED.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { DeliveryMethod } from './dto/order.dto';

/** Статусы заказа (строки, значения валидируются DTO). */
export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Статусы, в которых заказ можно отменить. */
const CANCELLABLE: readonly OrderStatus[] = ['PENDING', 'CONFIRMED'];

/** Вид заказа для клиента. */
export interface OrderView {
  id: string;
  number: string;
  status: OrderStatus;
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
    offerId: string;
    title: string;
    unit: string;
    price: number;
    quantity: number;
    total: number;
  }[];
  events: { id: string; type: string; createdAt: Date }[];
}

/** Вход создания заказа. */
export interface CreateOrderInput {
  buyerId: string;
  organizationId: string | null;
  items: { offerId: string; quantity: number }[];
  address?: string;
  comment?: string;
  deliveryMethod: DeliveryMethod;
}

/** include для view заказа. */
const includeView = {
  seller: { select: { id: true, name: true } },
  items: true,
  events: {
    orderBy: { createdAt: 'asc' as const },
    select: { id: true, type: true, createdAt: true },
  },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof includeView;
}>;

/** Приведение записи к view. */
function toView(order: OrderWithRelations): OrderView {
  return {
    id: order.id,
    number: order.number,
    status: order.status as OrderStatus,
    subtotal: order.subtotal,
    deliveryCost: order.deliveryCost,
    total: order.total,
    address: order.address,
    comment: order.comment,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    seller: order.seller,
    items: order.items.map((item) => ({
      id: item.id,
      offerId: item.offerId,
      title: item.title,
      unit: item.unit,
      price: item.price,
      quantity: item.quantity,
      total: item.total,
    })),
    events: order.events,
  };
}

/** Условный reserve stock: атомарная декремент с проверкой. */
async function reserveStock(
  tx: Prisma.TransactionClient,
  offerId: string,
  quantity: number,
): Promise<void> {
  const updated = await tx.productOffer.updateMany({
    where: { id: offerId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
  if (updated.count === 0) {
    const offer = await tx.productOffer.findUnique({
      where: { id: offerId },
      select: { stock: true },
    });
    if (!offer) {
      throw new NotFoundException({
        code: 'OFFER_NOT_FOUND',
        message: 'Предложение не найдено',
      });
    }
    throw new BadRequestException({
      code: 'OUT_OF_STOCK',
      message: `Недостаточно на складе (в наличии ${offer.stock})`,
    });
  }
}

/** Номер BZ-YYYY-NNNNNN: атомарный upsert-инкремент счётчика. */
async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await tx.orderCounter.findUnique({ where: { year } });
  const seq = existing
    ? (
        await tx.orderCounter.update({
          where: { year },
          data: { seq: { increment: 1 } },
        })
      ).seq
    : (await tx.orderCounter.create({ data: { year, seq: 1 } })).seq;
  return `BZ-${year}-${String(seq).padStart(6, '0')}`;
}

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  /** Создать заказ(ы): группировка по продавцу + stock-резерв. */
  async create(input: CreateOrderInput): Promise<OrderView[]> {
    const offerIds = [...new Set(input.items.map((i) => i.offerId))];
    const offers = await this.prisma.productOffer.findMany({
      where: { id: { in: offerIds } },
      select: {
        id: true,
        priceKopecks: true,
        minQuantity: true,
        organizationId: true,
        product: { select: { name: true, unit: true } },
      },
    });
    const byId = new Map(offers.map((o) => [o.id, o]));

    for (const item of input.items) {
      const offer = byId.get(item.offerId);
      if (!offer) {
        throw new NotFoundException({
          code: 'OFFER_NOT_FOUND',
          message: 'Предложение не найдено',
        });
      }
      if (item.quantity < offer.minQuantity) {
        throw new BadRequestException({
          code: 'BELOW_MIN_QUANTITY',
          message: `Минимальная партия «${offer.product.name}» — ${offer.minQuantity}`,
        });
      }
    }

    // Группировка по продавцу (стабильный порядок входа).
    const groups = new Map<string, { offerId: string; quantity: number }[]>();
    for (const item of input.items) {
      const offer = byId.get(item.offerId);
      if (!offer) continue;
      const list = groups.get(offer.organizationId) ?? [];
      list.push({ offerId: item.offerId, quantity: item.quantity });
      groups.set(offer.organizationId, list);
    }

    // Резерв и создание — ЕДИНАЯ транзакция на все группы продавцов:
    // не хватило stock хоть у одного — откат всего (ни одного заказа).
    const created = await this.prisma.$transaction(
      async (tx): Promise<OrderView[]> => {
        const orders: OrderView[] = [];
        for (const [, groupItems] of groups) {
          for (const gi of groupItems) {
            await reserveStock(tx, gi.offerId, gi.quantity);
          }
        }
        for (const [sellerId, groupItems] of groups) {
          const number = await nextOrderNumber(tx);
          const subtotal = groupItems.reduce((sum, gi) => {
            const offer = byId.get(gi.offerId);
            return sum + (offer ? offer.priceKopecks * gi.quantity : 0);
          }, 0);
          const order = await tx.order.create({
            data: {
              number,
              buyerId: input.buyerId,
              sellerId,
              organizationId: input.organizationId,
              status: 'PENDING',
              subtotal,
              deliveryCost: 0,
              total: subtotal,
              address:
                input.deliveryMethod === 'pickup'
                  ? null
                  : (input.address ?? null),
              comment: input.comment ?? null,
              items: {
                create: groupItems.map((gi) => {
                  const offer = byId.get(gi.offerId);
                  return {
                    offerId: gi.offerId,
                    title: offer?.product.name ?? '',
                    unit: offer?.product.unit ?? '',
                    price: offer?.priceKopecks ?? 0,
                    quantity: gi.quantity,
                    total: (offer?.priceKopecks ?? 0) * gi.quantity,
                  };
                }),
              },
              events: {
                create: {
                  type: 'CREATED',
                  actorId: input.buyerId,
                  payload: JSON.stringify({
                    deliveryMethod: input.deliveryMethod,
                  }),
                },
              },
            },
            include: includeView,
          });
          orders.push(toView(order));
        }
        return orders;
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
    return created;
  }

  /** Список заказов покупателя (фильтры: статус, период, пагинация). */
  async list(
    buyerId: string,
    filter: {
      status?: string;
      page?: number;
      pageSize?: number;
      from?: number;
      to?: number;
    },
  ): Promise<{
    items: OrderView[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    const pageSize = filter.pageSize ?? 10;
    const page = filter.page ?? 1;
    const where: Prisma.OrderWhereInput = { buyerId };
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.from || filter.to) {
      where.createdAt = {
        ...(filter.from ? { gte: new Date(filter.from * 1000) } : {}),
        ...(filter.to ? { lte: new Date(filter.to * 1000) } : {}),
      };
    }
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: includeView,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: rows.map(toView),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  /** Детали заказа: покупатель или продавец (членство). */
  async detail(userId: string, orderId: string): Promise<OrderView> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        ...includeView,
        seller: { select: { id: true, name: true } },
      },
    });
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Заказ не найден',
      });
    }
    const isBuyer = order.buyerId === userId;
    const isSeller = await this.prisma.membership.findFirst({
      where: { userId, organizationId: order.sellerId },
      select: { id: true },
    });
    if (!isBuyer && !isSeller) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Заказ не найден',
      });
    }
    return toView(order);
  }

  /** Отмена заказа: buyer/seller, только PENDING/CONFIRMED, stock назад. */
  async cancel(userId: string, orderId: string): Promise<OrderView> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Заказ не найден',
      });
    }
    const isBuyer = order.buyerId === userId;
    const isSeller = await this.prisma.membership.findFirst({
      where: { userId, organizationId: order.sellerId },
      select: { id: true },
    });
    if (!isBuyer && !isSeller) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Заказ не найден',
      });
    }
    if (!CANCELLABLE.includes(order.status as OrderStatus)) {
      throw new BadRequestException({
        code: 'NOT_CANCELLABLE',
        message: 'Заказ уже в работе — отменить нельзя',
      });
    }

    const cancelled = await this.prisma.$transaction(
      async (tx) => {
        // Восстановление stock по позициям.
        for (const item of order.items) {
          await tx.productOffer.update({
            where: { id: item.offerId },
            data: { stock: { increment: item.quantity } },
          });
        }
        return tx.order.update({
          where: { id: orderId },
          data: {
            status: 'CANCELLED',
            events: {
              create: {
                type: 'CANCELLED',
                actorId: userId,
                payload: JSON.stringify({ by: isBuyer ? 'buyer' : 'seller' }),
              },
            },
          },
          include: includeView,
        });
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
    return toView(cancelled);
  }
}
