/**
 * Сервис склада (Промт 11): склады, остатки, журнал движений,
 * перемещения. Пересчёт баланса — через stock.helper (единое ядро).
 *
 * Инварианты:
 * - все операции в рамках организации продавца (membership guard);
 * - ручные движения: RECEIPT/WRITE_OFF/ADJUSTMENT (заказные —
 *   RESERVED/SALE_OUT/UNRESERVED/RETURN_IN — только из логики);
 * - quantity > 0 для RECEIPT/WRITE_OFF; ADJUSTMENT — дельта со
 *   знаком (может увести в минус);
 * - списания (WRITE_OFF/TRANSFER_OUT/RESERVED) не уводят
 *   доступный остаток в минус;
 * - перемещение — пара TRANSFER_OUT/TRANSFER_IN в одной транзакции;
 * - склад удаляется только без движений (журнал append-only).
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../common/filters/api-error';
import type { SellerContext } from '../seller/guards/seller-membership.guard';
import {
  applyMovement,
  ensureDefaultLocation,
  requireOffer,
  totalsOf,
} from './stock.helper';
import type {
  CreateLocationDto,
  CreateMovementDto,
  TransferDto,
  UpdateLocationDto,
} from './dto/stock.dto';

/** include журнала: товар и склад для отображения. */
const movementInclude = {
  offer: { select: { product: { select: { name: true } } } },
  location: { select: { name: true } },
} satisfies Prisma.StockMovementInclude;

type MovementRow = Prisma.StockMovementGetPayload<{
  include: typeof movementInclude;
}>;

/** Вид движения для клиента. */
function toMovementView(row: MovementRow) {
  return {
    id: row.id,
    offerId: row.offerId,
    offerTitle: row.offer.product.name,
    locationId: row.locationId,
    locationName: row.location.name,
    type: row.type,
    quantityDelta: row.quantityDelta,
    reason: row.reason,
    refType: row.refType,
    refId: row.refId,
    createdAt: row.createdAt,
  };
}

/** Вид остатка для клиента. */
function toBalanceView(row: {
  offerId: string;
  locationId: string;
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
  updatedAt: Date;
  location: { name: string };
}) {
  return {
    offerId: row.offerId,
    locationId: row.locationId,
    locationName: row.location.name,
    physicalQty: row.physicalQty,
    reservedQty: row.reservedQty,
    availableQty: row.availableQty,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------
  // Склады
  // -------------------------------------------------------------------

  /** Склады организации продавца. */
  async listLocations(seller: SellerContext) {
    const locations = await this.prisma.stockLocation.findMany({
      where: { organizationId: seller.organizationId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return locations.map((location) => ({
      id: location.id,
      name: location.name,
      type: location.type,
      address: location.address,
      isDefault: location.isDefault,
      createdAt: location.createdAt,
    }));
  }

  /** Создать склад; isDefault снимается с прежнего дефолтного. */
  async createLocation(seller: SellerContext, dto: CreateLocationDto) {
    const location = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.stockLocation.updateMany({
          where: {
            organizationId: seller.organizationId,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }
      return tx.stockLocation.create({
        data: {
          organizationId: seller.organizationId,
          name: dto.name.trim(),
          type: dto.type,
          address: dto.address?.trim() || null,
          isDefault: dto.isDefault ?? false,
        },
      });
    });
    return {
      id: location.id,
      name: location.name,
      type: location.type,
      address: location.address,
      isDefault: location.isDefault,
      createdAt: location.createdAt,
    };
  }

  /** Склад организации или 404 (без раскрытия чужих). */
  private async ownLocation(seller: SellerContext, id: string) {
    const location = await this.prisma.stockLocation.findUnique({
      where: { id },
    });
    if (!location || location.organizationId !== seller.organizationId) {
      throw new NotFoundException({
        code: 'STOCK_LOCATION_NOT_FOUND',
        message: 'Склад не найден',
      });
    }
    return location;
  }

  /** Обновить склад; смена дефолта — атомарно. */
  async updateLocation(
    seller: SellerContext,
    id: string,
    dto: UpdateLocationDto,
  ) {
    await this.ownLocation(seller, id);
    const location = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.stockLocation.updateMany({
          where: {
            organizationId: seller.organizationId,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }
      return tx.stockLocation.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.address !== undefined
            ? { address: dto.address?.trim() || null }
            : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
    });
    return {
      id: location.id,
      name: location.name,
      type: location.type,
      address: location.address,
      isDefault: location.isDefault,
      createdAt: location.createdAt,
    };
  }

  /** Удалить склад: только если нет движений (журнал append-only). */
  async deleteLocation(seller: SellerContext, id: string) {
    await this.ownLocation(seller, id);
    const movements = await this.prisma.stockMovement.count({
      where: { locationId: id },
    });
    if (movements > 0) {
      throw new ApiError(
        409,
        'STOCK_LOCATION_HAS_MOVEMENTS',
        'По складу есть движения — удаление невозможно',
      );
    }
    await this.prisma.stockBalance.deleteMany({ where: { locationId: id } });
    await this.prisma.stockLocation.delete({ where: { id } });
    return { deleted: true };
  }

  // -------------------------------------------------------------------
  // Остатки
  // -------------------------------------------------------------------

  /** Остатки организации (фильтры: склад, оффер). */
  async listBalances(
    seller: SellerContext,
    filter: {
      locationId?: string;
      offerId?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, filter.pageSize ?? 20));
    const where: Prisma.StockBalanceWhereInput = {
      location: { organizationId: seller.organizationId },
      ...(filter.locationId ? { locationId: filter.locationId } : {}),
      ...(filter.offerId ? { offerId: filter.offerId } : {}),
      OR: [
        { physicalQty: { not: 0 } },
        { reservedQty: { not: 0 } },
        { availableQty: { not: 0 } },
      ],
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.stockBalance.count({ where }),
      this.prisma.stockBalance.findMany({
        where,
        include: { location: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: rows.map(toBalanceView),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  /** Конкретный остаток (offerId + locationId). */
  async getBalance(seller: SellerContext, offerId: string, locationId: string) {
    const offer = await this.prisma.productOffer.findUnique({
      where: { id: offerId },
      select: { organizationId: true },
    });
    if (!offer || offer.organizationId !== seller.organizationId) {
      throw new NotFoundException({
        code: 'OFFER_NOT_FOUND',
        message: 'Предложение не найдено',
      });
    }
    const balance = await this.prisma.stockBalance.findUnique({
      where: { offerId_locationId: { offerId, locationId } },
      include: { location: { select: { name: true } } },
    });
    if (!balance) {
      throw new NotFoundException({
        code: 'STOCK_BALANCE_NOT_FOUND',
        message: 'Остаток не найден',
      });
    }
    return toBalanceView(balance);
  }

  /** Сводный остаток оффера по всем складам организации. */
  async summary(seller: SellerContext, offerId: string) {
    const offer = await requireOffer(this.prisma, offerId);
    if (offer.organizationId !== seller.organizationId) {
      throw new NotFoundException({
        code: 'OFFER_NOT_FOUND',
        message: 'Предложение не найдено',
      });
    }
    const totals = await totalsOf(this.prisma, offerId);
    const locationsCount = await this.prisma.stockBalance.count({
      where: { offerId, physicalQty: { not: 0 } },
    });
    return { offerId, ...totals, locationsCount };
  }

  // -------------------------------------------------------------------
  // Движения
  // -------------------------------------------------------------------

  /** Журнал движений организации (фильтры, пагинация). */
  async listMovements(
    seller: SellerContext,
    filter: {
      offerId?: string;
      locationId?: string;
      type?: string;
      from?: number;
      to?: number;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, filter.pageSize ?? 20));
    const where: Prisma.StockMovementWhereInput = {
      location: { organizationId: seller.organizationId },
      ...(filter.offerId ? { offerId: filter.offerId } : {}),
      ...(filter.locationId ? { locationId: filter.locationId } : {}),
      ...(filter.type
        ? { type: filter.type as Prisma.EnumStockMovementTypeFilter['equals'] }
        : {}),
      ...(filter.from || filter.to
        ? {
            createdAt: {
              ...(filter.from ? { gte: new Date(filter.from * 1000) } : {}),
              ...(filter.to ? { lte: new Date(filter.to * 1000) } : {}),
            },
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        include: movementInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: rows.map(toMovementView),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  /** Ручное движение: приход / списание / корректировка. */
  async createMovement(seller: SellerContext, dto: CreateMovementDto) {
    const offer = await requireOffer(this.prisma, dto.offerId);
    if (offer.organizationId !== seller.organizationId) {
      throw new NotFoundException({
        code: 'OFFER_NOT_FOUND',
        message: 'Предложение не найдено',
      });
    }

    if (dto.type !== 'ADJUSTMENT' && dto.quantity <= 0) {
      throw new BadRequestException({
        code: 'STOCK_INVALID_QUANTITY',
        message: 'Количество должно быть положительным',
      });
    }
    if (dto.type === 'ADJUSTMENT' && dto.quantity === 0) {
      throw new BadRequestException({
        code: 'STOCK_INVALID_QUANTITY',
        message: 'Корректировка не может быть нулевой',
      });
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const locationId =
          dto.locationId ??
          (await ensureDefaultLocation(tx, seller.organizationId));
        if (dto.locationId) {
          const location = await tx.stockLocation.findUnique({
            where: { id: dto.locationId },
            select: { organizationId: true },
          });
          if (!location || location.organizationId !== seller.organizationId) {
            throw new NotFoundException({
              code: 'STOCK_LOCATION_NOT_FOUND',
              message: 'Склад не найден',
            });
          }
        }
        const before = await totalsOf(tx, dto.offerId);
        const balance = await applyMovement(tx, {
          offerId: dto.offerId,
          locationId,
          type: dto.type,
          quantity: dto.quantity,
          reason: dto.reason,
          actorId: seller.userId,
          refType: 'manual',
          refId: null,
        });
        const after = await totalsOf(tx, dto.offerId);
        return {
          balance,
          before,
          after,
          offerId: dto.offerId,
          offerName: offer.product.name,
          quantity: dto.quantity,
        };
      },
      { timeout: 30_000, maxWait: 10_000 },
    );

    // Уведомления продавцам организации (Промт 11, §6):
    // списание — всегда; обнуление доступного остатка — дополнительно.
    await this.notifyStockEvent(seller, dto.type, result, dto.reason);

    const location = await this.prisma.stockLocation.findUnique({
      where: { id: result.balance.locationId },
      select: { name: true },
    });
    return {
      balance: toBalanceView({
        ...result.balance,
        location: { name: location?.name ?? '' },
      }),
      totals: result.after,
    };
  }

  /** Перемещение между складами: пара движений в одной транзакции. */
  async transfer(seller: SellerContext, dto: TransferDto) {
    const offer = await requireOffer(this.prisma, dto.offerId);
    if (offer.organizationId !== seller.organizationId) {
      throw new NotFoundException({
        code: 'OFFER_NOT_FOUND',
        message: 'Предложение не найдено',
      });
    }
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException({
        code: 'STOCK_SAME_LOCATION',
        message: 'Исходный и целевой склад совпадают',
      });
    }

    const balances = await this.prisma.$transaction(
      async (tx) => {
        const locations = await tx.stockLocation.findMany({
          where: { id: { in: [dto.fromLocationId, dto.toLocationId] } },
          select: { id: true, organizationId: true, name: true },
        });
        const own = locations.filter(
          (l) => l.organizationId === seller.organizationId,
        );
        if (own.length !== 2) {
          throw new NotFoundException({
            code: 'STOCK_LOCATION_NOT_FOUND',
            message: 'Склад не найден',
          });
        }
        await applyMovement(tx, {
          offerId: dto.offerId,
          locationId: dto.fromLocationId,
          type: 'TRANSFER_OUT',
          quantity: dto.quantity,
          reason: dto.reason,
          actorId: seller.userId,
          refType: 'manual',
          refId: dto.toLocationId,
        });
        await applyMovement(tx, {
          offerId: dto.offerId,
          locationId: dto.toLocationId,
          type: 'TRANSFER_IN',
          quantity: dto.quantity,
          reason: dto.reason,
          actorId: seller.userId,
          refType: 'manual',
          refId: dto.fromLocationId,
        });
        return tx.stockBalance.findMany({
          where: {
            offerId: dto.offerId,
            locationId: { in: [dto.fromLocationId, dto.toLocationId] },
          },
          include: { location: { select: { name: true } } },
        });
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
    return { items: balances.map(toBalanceView) };
  }

  /** Уведомление о складском событии продавцам организации. */
  private async notifyStockEvent(
    seller: SellerContext,
    type: CreateMovementDto['type'],
    result: {
      offerId: string;
      offerName: string;
      quantity: number;
      before: { availableQty: number };
      after: { availableQty: number };
    },
    reason: string,
  ): Promise<void> {
    const members = await this.prisma.membership.findMany({
      where: {
        organizationId: seller.organizationId,
        role: 'WHOLESALE_SELLER',
      },
      select: { userId: true },
    });
    if (members.length === 0) return;

    if (type === 'WRITE_OFF') {
      await this.prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          type: 'STOCK_WRITE_OFF',
          title: 'Списание товара',
          body: `Списано ${Math.abs(result.quantity)} ед. товара «${result.offerName}». Причина: ${reason}`,
          payload: JSON.stringify({ offerId: result.offerId }),
        })),
      });
    }
    if (result.before.availableQty > 0 && result.after.availableQty === 0) {
      await this.prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          type: 'STOCK_EMPTY',
          title: 'Товар закончился',
          body: `Товар «${result.offerName}» закончился на складе`,
          payload: JSON.stringify({ offerId: result.offerId }),
        })),
      });
    }
  }
}
