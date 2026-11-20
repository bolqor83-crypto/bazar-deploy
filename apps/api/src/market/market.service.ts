/**
 * Сервис рынка (Промт 17, Часть B — ADR 0017).
 *
 * Маршрут покупателя: активные заказы (CONFIRMED / PREPARING /
 * READY) → позиции продавцов на демо-сетке рынка → оптимальный
 * порядок обхода от входа (Held-Karp ≤ 12, дальше NN + 2-opt).
 * PENDING исключён: продавец может отмен неподтверждённый заказ.
 *
 * Позиция продавца: marketRow/marketSpot на BusinessLocation.
 * Ставится и снимается организацией целиком (PUT/DELETE
 * /market/position) — без выбора конкретной точки: у организации
 * одна позиция на рынке. Чужие заказы в route не попадают и
 * существованием не раскрываются (изоляция покупателя).
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../common/filters/api-error';
import { toLocationResponse } from '../common/mappers';
import { optimizeRoute, type OptimizeStop } from './route-optimizer';

/**
 * Конфигурация демо-сетки рынка — зеркало MARKET из
 * packages/types (как ORDER_STATUSES в order.service: api не
 * тянет workspace-пакет, единый источник значений — ADR 0017).
 */
const MARKET = {
  rows: 4,
  spots: 40,
  spotStepMeters: 3,
  rowStepMeters: 8,
  entrance: { row: 0, spot: 0 },
  walkSpeedMps: 1.2,
  maxStops: 20,
} as const;

/** Шаги сетки рынка в метрах. */
const STEPS = {
  spot: MARKET.spotStepMeters,
  row: MARKET.rowStepMeters,
} as const;

/** Статусы заказа, входящие в маршрут. */
export const ROUTE_ORDER_STATUSES = [
  'CONFIRMED',
  'PREPARING',
  'READY',
] as const;

/** Роли, которым разрешено управлять позицией на рынке. */
const POSITION_ROLES = ['WHOLESALE_SELLER', 'STORE_OWNER'] as const;

/** Кандидат остановки до оптимизации. */
interface StopCandidate {
  orderId: string;
  orderNumber: string;
  sellerId: string;
  sellerName: string;
  row: number;
  spot: number;
  status: (typeof ROUTE_ORDER_STATUSES)[number];
  itemsCount: number;
  total: number;
  createdAt: Date;
}

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  /** Маршрут покупателя по активным заказам. */
  async buildRoute(
    userId: string,
    options: { returnToStart: boolean; orderIds?: string[] },
  ) {
    const where = {
      buyerId: userId,
      status: { in: [...ROUTE_ORDER_STATUSES] },
      ...(options.orderIds ? { id: { in: options.orderIds } } : {}),
    };
    // createdAt ASC: детерминированный набор при усечении до maxStops.
    let orders = await this.prisma.order.findMany({
      where,
      include: {
        seller: { select: { id: true, name: true } },
        items: { select: { id: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const truncated = orders.length > MARKET.maxStops;
    if (truncated) {
      orders = orders.slice(0, MARKET.maxStops);
    }

    // Позиции продавцов: по одной (первой) локации с marketRow.
    const sellerIds = [...new Set(orders.map((o) => o.sellerId))];
    const positions = await this.prisma.businessLocation.findMany({
      where: { organizationId: { in: sellerIds }, marketRow: { not: null } },
      select: {
        organizationId: true,
        marketRow: true,
        marketSpot: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    const positionByOrg = new Map(positions.map((p) => [p.organizationId, p]));

    const candidates: StopCandidate[] = [];
    const unlocated: {
      orderId: string;
      orderNumber: string;
      sellerName: string;
    }[] = [];
    for (const order of orders) {
      const position = positionByOrg.get(order.sellerId);
      if (!position) {
        unlocated.push({
          orderId: order.id,
          orderNumber: order.number,
          sellerName: order.seller.name,
        });
        continue;
      }
      candidates.push({
        orderId: order.id,
        orderNumber: order.number,
        sellerId: order.seller.id,
        sellerName: order.seller.name,
        row: position.marketRow as number,
        spot: position.marketSpot as number,
        status: order.status as StopCandidate['status'],
        itemsCount: order.items.length,
        total: order.total,
        createdAt: order.createdAt,
      });
    }

    const optimizeStops: OptimizeStop[] = candidates.map((c) => ({
      id: c.orderId,
      row: c.row,
      spot: c.spot,
    }));
    const result = optimizeRoute(
      optimizeStops,
      MARKET.entrance,
      STEPS,
      options.returnToStart,
    );
    const byId = new Map(candidates.map((c) => [c.orderId, c]));
    const stops = result.ordered.map((stop, index) => {
      const candidate = byId.get(stop.id) as StopCandidate;
      return {
        orderId: candidate.orderId,
        orderNumber: candidate.orderNumber,
        seller: { id: candidate.sellerId, name: candidate.sellerName },
        row: candidate.row,
        spot: candidate.spot,
        status: candidate.status,
        itemsCount: candidate.itemsCount,
        total: candidate.total,
        legMeters: result.legs[index],
      };
    });

    return {
      market: {
        rows: MARKET.rows,
        spots: MARKET.spots,
        entrance: MARKET.entrance,
      },
      stops,
      totalMeters: result.totalMeters,
      estimatedMinutes: Math.ceil(
        result.totalMeters / MARKET.walkSpeedMps / 60,
      ),
      returnToStart: options.returnToStart,
      ...(options.returnToStart && result.returnLegMeters !== undefined
        ? { returnLegMeters: result.returnLegMeters }
        : {}),
      unlocated,
      truncated,
    };
  }

  /** Позиция организации на рынке (null — не задана). */
  async getPosition(organizationId: string) {
    const location = await this.prisma.businessLocation.findFirst({
      where: { organizationId, marketRow: { not: null } },
      orderBy: { createdAt: 'asc' },
    });
    if (!location) {
      return null;
    }
    return {
      locationId: location.id,
      name: location.name,
      marketRow: location.marketRow as number,
      marketSpot: location.marketSpot as number,
    };
  }

  /** Сохранить позицию организации (upsert). */
  async savePosition(
    userId: string,
    organizationId: string,
    dto: { marketRow: number; marketSpot: number },
  ) {
    await this.assertPositionRole(userId, organizationId);
    const target = await this.resolvePositionTarget(organizationId);
    const location = await this.prisma.businessLocation.update({
      where: { id: target.id },
      data: {
        marketRow: dto.marketRow,
        marketSpot: dto.marketSpot,
      },
    });
    return toLocationResponse(location);
  }

  /** Снять позицию организации (no-op, если позиции нет). */
  async clearPosition(userId: string, organizationId: string) {
    await this.assertPositionRole(userId, organizationId);
    const location = await this.prisma.businessLocation.findFirst({
      where: { organizationId, marketRow: { not: null } },
      orderBy: { createdAt: 'asc' },
    });
    if (!location) {
      return { cleared: false };
    }
    await this.prisma.businessLocation.update({
      where: { id: location.id },
      data: { marketRow: null, marketSpot: null },
    });
    return { cleared: true };
  }

  /** PATCH /locations/:id — рыночные поля конкретной точки. */
  async patchLocationMarket(
    userId: string,
    locationId: string,
    dto: { marketRow?: number | null; marketSpot?: number | null },
  ) {
    // Семантика полей: undefined — не трогать; null — очистить;
    // число — установить. Ряд и место задаются и чистятся вместе.
    const absentRow = dto.marketRow === undefined;
    const absentSpot = dto.marketSpot === undefined;
    if (absentRow !== absentSpot) {
      throw new BadRequestException({
        code: 'MARKET_POSITION_PARTIAL',
        message: 'Ряд и место задаются вместе',
      });
    }
    const location = await this.prisma.businessLocation.findUnique({
      where: { id: locationId },
    });
    if (!location) {
      throw new NotFoundException({
        code: 'LOCATION_NOT_FOUND',
        message: 'Точка не найдена',
      });
    }
    const membership = await this.prisma.membership.findFirst({
      where: { userId, organizationId: location.organizationId },
    });
    if (!membership) {
      // Чужая точка: не раскрываем существование.
      throw new NotFoundException({
        code: 'LOCATION_NOT_FOUND',
        message: 'Точка не найдена',
      });
    }
    if (
      !POSITION_ROLES.includes(
        membership.role as (typeof POSITION_ROLES)[number],
      )
    ) {
      throw new ApiError(
        403,
        'MARKET_POSITION_FORBIDDEN',
        'Позицию на рынке меняет продавец организации',
      );
    }
    // Оба поля отсутствуют — ничего не меняем (возврат текущего
    // состояния), оба null — очистка, оба числа — установка.
    const update =
      absentRow && absentSpot
        ? {}
        : {
            marketRow: dto.marketRow ?? null,
            marketSpot: dto.marketSpot ?? null,
          };
    const updated = await this.prisma.businessLocation.update({
      where: { id: locationId },
      data: update,
    });
    return toLocationResponse(updated);
  }

  /** Право на управление позицией: продавец организации. */
  private async assertPositionRole(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, organizationId },
    });
    if (!membership) {
      throw new ApiError(404, 'ORG_NOT_FOUND', 'Организация не найдена');
    }
    if (
      !POSITION_ROLES.includes(
        membership.role as (typeof POSITION_ROLES)[number],
      )
    ) {
      throw new ApiError(
        403,
        'MARKET_POSITION_FORBIDDEN',
        'Позицию на рынке меняет продавец организации',
      );
    }
  }

  /**
   * Целевая точка для позиции организации: существующая
   * позиционированная → первая точка → новая «Точка на рынке»
   * (у оптовика без городских точек).
   */
  private async resolvePositionTarget(organizationId: string) {
    const existing = await this.prisma.businessLocation.findFirst({
      where: { organizationId, marketRow: { not: null } },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      return existing;
    }
    const any = await this.prisma.businessLocation.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
    if (any) {
      return any;
    }
    return this.prisma.businessLocation.create({
      data: {
        organizationId,
        name: 'Точка на рынке',
        address: 'Центральный рынок',
        city: 'Ростов-на-Дону',
      },
    });
  }
}
