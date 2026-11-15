/**
 * Сервис заказов продавца (Промт 10, Часть C).
 *
 * Жизненный цикл (статусная машина, шаг вперёд только):
 *   PENDING → CONFIRMED → PREPARING → READY → COMPLETED
 * Отмена: PENDING/CONFIRMED → CANCELLED (остатки возвращаются:
 * PENDING — резервы, CONFIRMED — проданное; Промт 11, ADR 0012).
 *
 * Подтверждение (confirm) конвертирует резервы заказа в продажу:
 * на каждый RESERVED-кусок — пара SALE_OUT + UNRESERVED.
 *
 * Каждое действие — транзакция: статус + событие OrderEvent +
 * уведомление покупателю (notifyOrderEvent). Некорректный переход —
 * 400 INVALID_TRANSITION (аудит не пишется).
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  notifyOrderEvent,
  rubles,
  statusPhrase,
} from '../notifications/notify.helper';
import { toBrief } from '../delivery/delivery.service';
import {
  returnForOrder,
  saleOutForOrder,
  unreserveForOrder,
} from '../stock/stock.helper';
import type { OrderStatus } from '../orders/order.service';
import type { SellerContext } from './guards/seller-membership.guard';

/** Действия продавца. */
export const SELLER_ACTIONS = [
  'confirm',
  'preparing',
  'ready',
  'complete',
  'cancel',
] as const;
export type SellerAction = (typeof SELLER_ACTIONS)[number];

/** Целевой статус и допустимые исходные для каждого действия. */
const TRANSITIONS: Record<
  SellerAction,
  { to: OrderStatus; from: readonly OrderStatus[] }
> = {
  confirm: { to: 'CONFIRMED', from: ['PENDING'] },
  preparing: { to: 'PREPARING', from: ['CONFIRMED'] },
  ready: { to: 'READY', from: ['PREPARING'] },
  complete: { to: 'COMPLETED', from: ['READY'] },
  cancel: { to: 'CANCELLED', from: ['PENDING', 'CONFIRMED'] },
};

/** include для вида заказа продавца. */
const includeSellerView = {
  seller: { select: { id: true, name: true } },
  buyer: { select: { id: true, name: true, phone: true } },
  items: true,
  events: {
    orderBy: { createdAt: 'asc' as const },
    select: { id: true, type: true, createdAt: true },
  },
  deliveries: {
    where: {
      status: {
        in: [
          'PENDING',
          'ACCEPTED',
          'PICKED_UP',
          'IN_TRANSIT',
          'DELIVERED',
          'COMPLETED',
        ],
      },
    },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: { carrierOrganization: { select: { name: true } } },
  },
} satisfies Prisma.OrderInclude;

type SellerOrderRow = Prisma.OrderGetPayload<{
  include: typeof includeSellerView;
}>;

/** Вид заказа продавца (клиентский контракт). */
export interface SellerOrderView {
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
  buyer: { id: string; name: string; phone: string };
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
  /** Активная доставка заказа (Промт 10, Часть D). */
  delivery: ReturnType<typeof toBrief> | null;
}

/** Приведение записи к виду продавца. */
function toSellerView(order: SellerOrderRow): SellerOrderView {
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
    buyer: order.buyer,
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
    delivery: order.deliveries?.[0] ? toBrief(order.deliveries[0]) : null,
  };
}

@Injectable()
export class SellerOrderService {
  constructor(private readonly prisma: PrismaService) {}

  /** Список заказов организации-продавца. */
  async list(
    seller: SellerContext,
    filter: {
      statuses?: string[];
      search?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{
    items: SellerOrderView[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    const pageSize = filter.pageSize ?? 10;
    const page = filter.page ?? 1;
    const where: Prisma.OrderWhereInput = {
      sellerId: seller.organizationId,
    };
    if (filter.statuses && filter.statuses.length > 0) {
      where.status = { in: filter.statuses };
    }
    if (filter.search && filter.search.trim() !== '') {
      const term = filter.search.trim();
      where.OR = [
        { number: { contains: term, mode: 'insensitive' } },
        { buyer: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: includeSellerView,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: rows.map(toSellerView),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  /** Детали заказа продавца (membership уже проверен guard'ом). */
  async detail(
    seller: SellerContext,
    orderId: string,
  ): Promise<SellerOrderView> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId: seller.organizationId },
      include: includeSellerView,
    });
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Заказ не найден',
      });
    }
    return toSellerView(order);
  }

  /** Действие по заказу: переход статуса + событие + уведомление. */
  async act(
    seller: SellerContext,
    orderId: string,
    action: SellerAction,
  ): Promise<SellerOrderView> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId: seller.organizationId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Заказ не найден',
      });
    }
    const rule = TRANSITIONS[action];
    if (!rule.from.includes(order.status as OrderStatus)) {
      throw new BadRequestException({
        code: 'INVALID_TRANSITION',
        message: `Действие «${action}» недоступно для статуса ${order.status}`,
      });
    }

    const updated = await this.prisma.$transaction(
      async (tx): Promise<SellerOrderRow> => {
        // Подтверждение: резервы заказа → продажа (SALE_OUT +
        // UNRESERVED по каждому складу, Промт 11).
        if (action === 'confirm') {
          await saleOutForOrder(tx, order.id, order.number, seller.userId);
        }
        // Отмена: PENDING — возврат резерва, CONFIRMED — возврат
        // проданного товара (Промт 11, ADR 0012).
        if (action === 'cancel') {
          if (order.status === 'CONFIRMED') {
            await returnForOrder(tx, order.id, order.number, seller.userId);
          } else {
            await unreserveForOrder(tx, order.id, order.number, seller.userId);
          }
        }
        const row = await tx.order.update({
          where: { id: order.id },
          data: {
            status: rule.to,
            events: {
              create: {
                type: rule.to,
                actorId: seller.userId,
                payload: JSON.stringify({ by: 'seller', action }),
              },
            },
          },
          include: includeSellerView,
        });
        // Уведомление покупателю о смене статуса/отмене.
        await notifyOrderEvent(tx, {
          userIds: [order.buyerId],
          type: action === 'cancel' ? 'ORDER_CANCELLED' : 'ORDER_STATUS',
          title:
            action === 'cancel'
              ? `Заказ ${order.number} отменён продавцом`
              : `Заказ ${order.number} — ${statusPhrase(rule.to)}`,
          body:
            action === 'cancel'
              ? `Продавец ${row.seller.name} отменил заказ ${order.number}. Резерв товаров снят.`
              : `Продавец ${row.seller.name}: заказ ${order.number} ${statusPhrase(rule.to)}.`,
          orderId: order.id,
          orderNumber: order.number,
          extra: { status: rule.to, by: 'seller' },
        });
        return row;
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
    return toSellerView(updated);
  }
}
