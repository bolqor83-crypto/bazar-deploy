/**
 * Сервис доставок (Промт 10, Часть D).
 *
 * Статусная машина:
 *   PENDING → ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED → COMPLETED
 * Отмена: PENDING (инициатор заявки — buyer/seller) или
 * ACCEPTED (перевозчик) → CANCELLED с причиной.
 *
 * Роли:
 * - заявку создаёт покупатель заказа или продавец организации
 *   (статус заказа CONFIRMED/PREPARING/READY, активная заявка одна);
 * - принимает и ведёт рейс организация-перевозчик (любой её член
 *   с ролью CARRIER — командная модель);
 * - завершает (DELIVERED → COMPLETED) только покупатель заказа.
 *
 * Каждое действие — транзакция: статус + DeliveryEvent +
 * уведомления участникам (buyer, инициатор, перевозчики).
 * Принятие атомарно: updateMany с WHERE status = PENDING —
 * вторая организация получить ACCEPTED не может.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  deliveryStatusPhrase,
  notifyDeliveryEvent,
  rubles,
} from '../notifications/notify.helper';
import type { CarrierContext } from './guards/carrier-membership.guard';

/** Статусы доставки (строки, значения валидируются сервисом). */
export const DELIVERY_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/** Статусы заказа, в которых доступно создание заявки. */
const ORDER_STATUSES_ALLOWED: readonly string[] = [
  'CONFIRMED',
  'PREPARING',
  'READY',
];

/** Незавершённые статусы: на заказ — не больше одной такой заявки. */
const ACTIVE_STATUSES: readonly DeliveryStatus[] = [
  'PENDING',
  'ACCEPTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
];

/** Действия ведения рейса перевозчиком. */
export const CARRIER_ACTIONS = [
  'accept',
  'picked-up',
  'in-transit',
  'delivered',
] as const;
export type CarrierAction = (typeof CARRIER_ACTIONS)[number];

/** Целевой статус и допустимые исходные для действий перевозчика. */
const CARRIER_TRANSITIONS: Record<
  CarrierAction,
  { to: DeliveryStatus; from: readonly DeliveryStatus[] }
> = {
  accept: { to: 'ACCEPTED', from: ['PENDING'] },
  'picked-up': { to: 'PICKED_UP', from: ['ACCEPTED'] },
  'in-transit': { to: 'IN_TRANSIT', from: ['PICKED_UP'] },
  delivered: { to: 'DELIVERED', from: ['IN_TRANSIT'] },
};

/** include для вида доставки. */
const includeView = {
  order: { select: { id: true, number: true, buyerId: true, sellerId: true } },
  requester: { select: { id: true, name: true } },
  carrierOrganization: { select: { id: true, name: true } },
  events: {
    orderBy: { createdAt: 'asc' as const },
    select: { id: true, type: true, actorId: true, createdAt: true },
  },
} satisfies Prisma.DeliveryRequestInclude;

type DeliveryRow = Prisma.DeliveryRequestGetPayload<{
  include: typeof includeView;
}>;

/** Вид доставки (клиентский контракт, packages/types). */
export interface DeliveryView {
  id: string;
  number: string;
  orderId: string;
  orderNumber: string;
  requesterId: string;
  requesterName: string;
  carrierId: string | null;
  carrierName: string | null;
  status: DeliveryStatus;
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
  events: {
    id: string;
    type: string;
    actorId: string | null;
    createdAt: Date;
  }[];
}

/** Краткий вид доставки для карточки заказа. */
export interface DeliveryBrief {
  id: string;
  number: string;
  status: DeliveryStatus;
  carrierName: string | null;
  dropoffAddress: string;
  price: number | null;
}

/** Приведение записи к виду доставки. */
function toView(delivery: DeliveryRow): DeliveryView {
  return {
    id: delivery.id,
    number: delivery.number,
    orderId: delivery.orderId,
    orderNumber: delivery.order.number,
    requesterId: delivery.requesterId,
    requesterName: delivery.requester.name,
    carrierId: delivery.carrierOrganization?.id ?? null,
    carrierName: delivery.carrierOrganization?.name ?? null,
    status: delivery.status as DeliveryStatus,
    pickupAddress: delivery.pickupAddress,
    pickupContact: delivery.pickupContact,
    dropoffAddress: delivery.dropoffAddress,
    dropoffContact: delivery.dropoffContact,
    weightKg: delivery.weightKg,
    volumeL: delivery.volumeL,
    cargoNotes: delivery.cargoNotes,
    price: delivery.price,
    cancelReason: delivery.cancelReason,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
    events: delivery.events,
  };
}

/** Активная заявка заказа → краткий вид (для OrderView). */
export function toBrief(
  delivery: Prisma.DeliveryRequestGetPayload<{
    include: { carrierOrganization: { select: { name: true } } };
  }>,
): DeliveryBrief {
  return {
    id: delivery.id,
    number: delivery.number,
    status: delivery.status as DeliveryStatus,
    carrierName: delivery.carrierOrganization?.name ?? null,
    dropoffAddress: delivery.dropoffAddress,
    price: delivery.price,
  };
}

/** Вход создания заявки. */
export interface CreateDeliveryInput {
  requesterId: string;
  orderId: string;
  pickupAddress: string;
  pickupContact: string;
  dropoffAddress: string;
  dropoffContact: string;
  weightKg?: number;
  volumeL?: number;
  cargoNotes?: string;
}

/** Участники доставки, которым уходит уведомление. */
async function participantIds(
  tx: Prisma.TransactionClient | PrismaService,
  delivery: DeliveryRow,
): Promise<string[]> {
  const ids = new Set<string>([delivery.order.buyerId, delivery.requesterId]);
  // Продавцы организации: передают груз перевозчику на точке
  // забора — для них статусы рейса операционно важны.
  const sellers = await tx.membership.findMany({
    where: {
      organizationId: delivery.order.sellerId,
      role: 'WHOLESALE_SELLER',
    },
    select: { userId: true },
  });
  for (const m of sellers) ids.add(m.userId);
  if (delivery.carrierOrganizationId) {
    const members = await tx.membership.findMany({
      where: {
        organizationId: delivery.carrierOrganizationId,
        role: 'CARRIER',
      },
      select: { userId: true },
    });
    for (const m of members) ids.add(m.userId);
  }
  return [...ids];
}

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Создать заявку на доставку заказа (buyer или seller). */
  async create(input: CreateDeliveryInput): Promise<DeliveryView> {
    const order = await this.prisma.order.findUnique({
      where: { id: input.orderId },
      select: {
        id: true,
        number: true,
        buyerId: true,
        sellerId: true,
        status: true,
      },
    });
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Заказ не найден',
      });
    }
    const isBuyer = order.buyerId === input.requesterId;
    const isSeller =
      !isBuyer &&
      (await this.prisma.membership.findFirst({
        where: {
          userId: input.requesterId,
          organizationId: order.sellerId,
          role: 'WHOLESALE_SELLER',
        },
        select: { id: true },
      })) !== null;
    if (!isBuyer && !isSeller) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Заказ не найден',
      });
    }
    if (!ORDER_STATUSES_ALLOWED.includes(order.status)) {
      throw new BadRequestException({
        code: 'DELIVERY_ORDER_NOT_READY',
        message:
          'Доставку можно заказать по подтверждённому заказу до его завершения',
      });
    }
    const active = await this.prisma.deliveryRequest.findFirst({
      where: { orderId: order.id, status: { in: [...ACTIVE_STATUSES] } },
      select: { id: true },
    });
    if (active) {
      throw new BadRequestException({
        code: 'DELIVERY_ALREADY_EXISTS',
        message: 'По заказу уже есть активная заявка на доставку',
      });
    }

    const created = await this.prisma.$transaction(
      async (tx): Promise<DeliveryRow> => {
        const number = await nextDeliveryNumber(tx);
        const row = await tx.deliveryRequest.create({
          data: {
            number,
            orderId: order.id,
            requesterId: input.requesterId,
            status: 'PENDING',
            pickupAddress: input.pickupAddress,
            pickupContact: input.pickupContact,
            dropoffAddress: input.dropoffAddress,
            dropoffContact: input.dropoffContact,
            weightKg: input.weightKg ?? null,
            volumeL: input.volumeL ?? null,
            cargoNotes: input.cargoNotes ?? null,
            events: {
              create: {
                type: 'CREATED',
                actorId: input.requesterId,
                payload: JSON.stringify({ by: isBuyer ? 'buyer' : 'seller' }),
              },
            },
          },
          include: includeView,
        });
        // Уведомить контрагента: покупатель создал — продавцам
        // организации, продавец — покупателю.
        if (isBuyer) {
          const members = await tx.membership.findMany({
            where: { organizationId: order.sellerId, role: 'WHOLESALE_SELLER' },
            select: { userId: true },
          });
          await notifyDeliveryEvent(tx, {
            userIds: members.map((m) => m.userId),
            type: 'NEW_DELIVERY',
            title: `Заявка на доставку ${number}`,
            body: `Покупатель запросил доставку по заказу ${order.number}: ${input.pickupAddress} → ${input.dropoffAddress}.`,
            deliveryId: row.id,
            deliveryNumber: number,
            orderId: order.id,
            orderNumber: order.number,
            extra: { by: 'buyer' },
          });
        } else {
          await notifyDeliveryEvent(tx, {
            userIds: [order.buyerId],
            type: 'NEW_DELIVERY',
            title: `Заявка на доставку ${number}`,
            body: `Продавец оформил доставку по заказу ${order.number}: ${input.pickupAddress} → ${input.dropoffAddress}.`,
            deliveryId: row.id,
            deliveryNumber: number,
            orderId: order.id,
            orderNumber: order.number,
            extra: { by: 'seller' },
          });
        }
        return row;
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
    return toView(created);
  }

  /** Детали доставки: участник (buyer/seller/requester/перевозчик). */
  async detail(userId: string, deliveryId: string): Promise<DeliveryView> {
    const delivery = await this.prisma.deliveryRequest.findUnique({
      where: { id: deliveryId },
      include: includeView,
    });
    if (!delivery) {
      throw new NotFoundException({
        code: 'DELIVERY_NOT_FOUND',
        message: 'Доставка не найдена',
      });
    }
    const allowed = await this.canAccess(userId, delivery);
    if (!allowed) {
      throw new NotFoundException({
        code: 'DELIVERY_NOT_FOUND',
        message: 'Доставка не найдена',
      });
    }
    return toView(delivery);
  }

  /** Лента перевозчика: feed (PENDING) или mine (своя организация). */
  async carrierList(
    carrier: CarrierContext,
    scope: 'feed' | 'mine',
    filter: { page?: number; pageSize?: number },
  ): Promise<{
    items: DeliveryView[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    const pageSize = filter.pageSize ?? 10;
    const page = filter.page ?? 1;
    const where: Prisma.DeliveryRequestWhereInput =
      scope === 'feed'
        ? { status: 'PENDING' }
        : { carrierOrganizationId: carrier.organizationId };
    const [rows, total] = await Promise.all([
      this.prisma.deliveryRequest.findMany({
        where,
        include: includeView,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.deliveryRequest.count({ where }),
    ]);
    return {
      items: rows.map(toView),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  /** Детали доставки для перевозчика: PENDING или своя организация. */
  async carrierDetail(
    carrier: CarrierContext,
    deliveryId: string,
  ): Promise<DeliveryView> {
    const delivery = await this.prisma.deliveryRequest.findUnique({
      where: { id: deliveryId },
      include: includeView,
    });
    if (
      !delivery ||
      (delivery.status !== 'PENDING' &&
        delivery.carrierOrganizationId !== carrier.organizationId)
    ) {
      throw new NotFoundException({
        code: 'DELIVERY_NOT_FOUND',
        message: 'Доставка не найдена',
      });
    }
    return toView(delivery);
  }

  /** Действие перевозчика: принять/забрать/в пути/доставить. */
  async carrierAct(
    carrier: CarrierContext,
    deliveryId: string,
    action: CarrierAction,
    price?: number,
  ): Promise<DeliveryView> {
    const rule = CARRIER_TRANSITIONS[action];
    const updated = await this.prisma.$transaction(
      async (tx): Promise<DeliveryRow> => {
        // Принятие атомарно: PENDING → ACCEPTED одним updateMany —
        // гонку двух перевозчиков выигрывает только один.
        if (action === 'accept') {
          const claim = await tx.deliveryRequest.updateMany({
            where: { id: deliveryId, status: 'PENDING' },
            data: {
              status: 'ACCEPTED',
              carrierOrganizationId: carrier.organizationId,
              ...(price !== undefined ? { price } : {}),
            },
          });
          if (claim.count === 0) {
            const existing = await tx.deliveryRequest.findUnique({
              where: { id: deliveryId },
              select: { id: true, carrierOrganizationId: true },
            });
            if (
              existing &&
              existing.carrierOrganizationId === carrier.organizationId
            ) {
              throw new BadRequestException({
                code: 'ALREADY_ACCEPTED',
                message: 'Заявка уже принята вашей организацией',
              });
            }
            throw new NotFoundException({
              code: 'DELIVERY_NOT_FOUND',
              message: 'Заявка недоступна — её уже забрали',
            });
          }
        } else {
          const delivery = await tx.deliveryRequest.findUnique({
            where: { id: deliveryId },
            select: { id: true, status: true, carrierOrganizationId: true },
          });
          if (
            !delivery ||
            (delivery.carrierOrganizationId !== carrier.organizationId &&
              // Свободная заявка публична в ленте: честный ответ —
              // некорректный переход, а не «не найдено».
              delivery.status !== 'PENDING')
          ) {
            throw new NotFoundException({
              code: 'DELIVERY_NOT_FOUND',
              message: 'Доставка не найдена',
            });
          }
          if (!rule.from.includes(delivery.status as DeliveryStatus)) {
            throw new BadRequestException({
              code: 'INVALID_TRANSITION',
              message: `Действие «${action}» недоступно для статуса ${delivery.status}`,
            });
          }
        }
        const row = await tx.deliveryRequest.update({
          where: { id: deliveryId },
          data: {
            status: rule.to,
            events: {
              create: {
                type: rule.to,
                actorId: carrier.userId,
                payload: JSON.stringify({ by: 'carrier', action }),
              },
            },
          },
          include: includeView,
        });
        // Уведомить участников (кроме инициатора-перевозчика).
        const recipients = (await participantIds(tx, row)).filter(
          (id) => id !== carrier.userId,
        );
        await notifyDeliveryEvent(tx, {
          userIds: recipients,
          type: 'DELIVERY_STATUS',
          title: `Доставка ${row.number} — ${deliveryStatusPhrase(rule.to)}`,
          body:
            action === 'accept'
              ? `${row.carrierOrganization?.name ?? 'Перевозчик'} принял заявку ${row.number} по заказу ${row.order.number}${row.price ? ` за ${rubles(row.price)}` : ''}.`
              : `Перевозчик: доставка ${row.number} по заказу ${row.order.number} ${deliveryStatusPhrase(rule.to)}.`,
          deliveryId: row.id,
          deliveryNumber: row.number,
          orderId: row.order.id,
          orderNumber: row.order.number,
          extra: { status: rule.to, by: 'carrier' },
        });
        return row;
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
    return toView(updated);
  }

  /** Завершение доставки: покупатель подтверждает DELIVERED → COMPLETED. */
  async complete(userId: string, deliveryId: string): Promise<DeliveryView> {
    const delivery = await this.prisma.deliveryRequest.findUnique({
      where: { id: deliveryId },
      include: includeView,
    });
    if (!delivery || delivery.order.buyerId !== userId) {
      throw new NotFoundException({
        code: 'DELIVERY_NOT_FOUND',
        message: 'Доставка не найдена',
      });
    }
    if (delivery.status !== 'DELIVERED') {
      throw new BadRequestException({
        code: 'INVALID_TRANSITION',
        message: `Завершить можно только доставленную заявку (статус ${delivery.status})`,
      });
    }
    const updated = await this.prisma.$transaction(
      async (tx): Promise<DeliveryRow> => {
        const row = await tx.deliveryRequest.update({
          where: { id: delivery.id },
          data: {
            status: 'COMPLETED',
            events: {
              create: {
                type: 'COMPLETED',
                actorId: userId,
                payload: JSON.stringify({ by: 'buyer' }),
              },
            },
          },
          include: includeView,
        });
        const recipients = (await participantIds(tx, row)).filter(
          (id) => id !== userId,
        );
        await notifyDeliveryEvent(tx, {
          userIds: recipients,
          type: 'DELIVERY_STATUS',
          title: `Доставка ${row.number} завершена`,
          body: `Покупатель подтвердил получение по заказу ${row.order.number}.`,
          deliveryId: row.id,
          deliveryNumber: row.number,
          orderId: row.order.id,
          orderNumber: row.order.number,
          extra: { status: 'COMPLETED', by: 'buyer' },
        });
        return row;
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
    return toView(updated);
  }

  /** Отмена: buyer/seller из PENDING, перевозчик из ACCEPTED. */
  async cancel(
    userId: string,
    deliveryId: string,
    reason: string,
  ): Promise<DeliveryView> {
    const delivery = await this.prisma.deliveryRequest.findUnique({
      where: { id: deliveryId },
      include: includeView,
    });
    if (!delivery) {
      throw new NotFoundException({
        code: 'DELIVERY_NOT_FOUND',
        message: 'Доставка не найдена',
      });
    }
    const isBuyer = delivery.order.buyerId === userId;
    const isRequester = delivery.requesterId === userId;
    const isSeller =
      !isBuyer &&
      (await this.prisma.membership.findFirst({
        where: {
          userId,
          organizationId: delivery.order.sellerId,
          role: 'WHOLESALE_SELLER',
        },
        select: { id: true },
      })) !== null;
    const isCarrier =
      delivery.carrierOrganizationId !== null &&
      (await this.prisma.membership.findFirst({
        where: {
          userId,
          organizationId: delivery.carrierOrganizationId,
          role: 'CARRIER',
        },
        select: { id: true },
      })) !== null;
    if (!isBuyer && !isRequester && !isSeller && !isCarrier) {
      throw new NotFoundException({
        code: 'DELIVERY_NOT_FOUND',
        message: 'Доставка не найдена',
      });
    }
    // Правила отмены по роли.
    if (isCarrier && !(isBuyer || isRequester || isSeller)) {
      if (delivery.status !== 'ACCEPTED') {
        throw new BadRequestException({
          code: 'INVALID_TRANSITION',
          message: `Перевозчик может отменить только принятую заявку (статус ${delivery.status})`,
        });
      }
    } else if (delivery.status !== 'PENDING') {
      throw new BadRequestException({
        code: 'INVALID_TRANSITION',
        message: `Отменить можно только заявку в ожидании (статус ${delivery.status})`,
      });
    }
    const by =
      isCarrier && !(isBuyer || isRequester || isSeller)
        ? 'carrier'
        : isBuyer || isRequester
          ? isBuyer
            ? 'buyer'
            : 'requester'
          : 'seller';

    const updated = await this.prisma.$transaction(
      async (tx): Promise<DeliveryRow> => {
        const row = await tx.deliveryRequest.update({
          where: { id: delivery.id },
          data: {
            status: 'CANCELLED',
            cancelReason: reason,
            events: {
              create: {
                type: 'CANCELLED',
                actorId: userId,
                payload: JSON.stringify({ by, reason }),
              },
            },
          },
          include: includeView,
        });
        const recipients = (await participantIds(tx, row)).filter(
          (id) => id !== userId,
        );
        await notifyDeliveryEvent(tx, {
          userIds: recipients,
          type: 'DELIVERY_CANCELLED',
          title: `Доставка ${row.number} отменена`,
          body: `Причина: ${reason}. Заказ ${row.order.number} затронут.`,
          deliveryId: row.id,
          deliveryNumber: row.number,
          orderId: row.order.id,
          orderNumber: row.order.number,
          extra: { by },
        });
        return row;
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
    return toView(updated);
  }

  /** Доступ пользователя к доставке (для detail). */
  private async canAccess(
    userId: string,
    delivery: DeliveryRow,
  ): Promise<boolean> {
    if (delivery.order.buyerId === userId || delivery.requesterId === userId) {
      return true;
    }
    const seller = await this.prisma.membership.findFirst({
      where: {
        userId,
        organizationId: delivery.order.sellerId,
        role: 'WHOLESALE_SELLER',
      },
      select: { id: true },
    });
    if (seller) return true;
    if (delivery.carrierOrganizationId) {
      const carrier = await this.prisma.membership.findFirst({
        where: {
          userId,
          organizationId: delivery.carrierOrganizationId,
          role: 'CARRIER',
        },
        select: { id: true },
      });
      if (carrier) return true;
    }
    return false;
  }
}

/** Номер DL-YYYY-NNNNNN: атомарный upsert-инкремент счётчика. */
async function nextDeliveryNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await tx.deliveryCounter.findUnique({ where: { year } });
  const seq = existing
    ? (
        await tx.deliveryCounter.update({
          where: { year },
          data: { seq: { increment: 1 } },
        })
      ).seq
    : (await tx.deliveryCounter.create({ data: { year, seq: 1 } })).seq;
  return `DL-${year}-${String(seq).padStart(6, '0')}`;
}
