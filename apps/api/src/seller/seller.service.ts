/**
 * Сервис кабинета продавца (Промт 10, Часть B).
 *
 * Products: CRUD + soft-delete (archivedAt). Товар принадлежит
 * организации продавца; каталог показывает неархивированные.
 *
 * Offers: CRUD + архив. Инварианты (Промт 11, ADR 0012):
 * - price > 0, stock >= 0, minQuantity >= 1 (DTO);
 * - смена цены → запись OfferPriceHistory;
 * - остатки — event-sourced: создание оффера со stock → INITIAL
 *   на default-складе; смена stock → ADJUSTMENT (дельта со
 *   знаком, reason из DTO); архив → WRITE_OFF доступного;
 * - DELETE offer: нет заказов — физически (движения и балансы
 *   удаляются), есть — архив;
 * - нулевой доступный остаток скрывает предложение из каталога.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../common/filters/api-error';
import {
  applyMovement,
  ensureDefaultLocation,
  totalsOf,
} from '../stock/stock.helper';
import type { SellerContext } from './guards/seller-membership.guard';
import type {
  ProductDto,
  UpdateProductDto,
  OfferDto,
  UpdateOfferDto,
} from './dto/seller.dto';

/** include товара для ответа продавца. */
const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  _count: { select: { offers: true } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

const offerInclude = {
  product: {
    select: {
      id: true,
      name: true,
      subtitle: true,
      unit: true,
      images: true,
      archivedAt: true,
    },
  },
  priceHistory: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
  },
  stockBalances: {
    select: { availableQty: true, physicalQty: true, reservedQty: true },
  },
  stockMovements: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
  },
} satisfies Prisma.ProductOfferInclude;

type OfferWithRelations = Prisma.ProductOfferGetPayload<{
  include: typeof offerInclude;
}>;

function parseImages(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function productView(product: ProductWithRelations) {
  return {
    id: product.id,
    title: product.name,
    subtitle: product.subtitle,
    description: product.description,
    categoryId: product.categoryId,
    category: product.category,
    unit: product.unit,
    images: parseImages(product.images),
    archivedAt: product.archivedAt,
    offersCount: product._count.offers,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function offerView(offer: OfferWithRelations) {
  // Доступный остаток — сумма по складам (Промт 11, ADR 0012);
  // контракт SellerOffer.stock сохранён для мобильного кабинета.
  const stock = offer.stockBalances.reduce(
    (sum, balance) => sum + balance.availableQty,
    0,
  );
  // Журнал изменений склада (контракт Промта 10) — вычисляется из
  // движений: кумулятивная сумма дельт = previous → new.
  const ordered = [...offer.stockMovements].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const stockChanges: {
    previousStock: number;
    newStock: number;
    reason: string;
    createdAt: Date;
  }[] = [];
  let cumulative = 0;
  for (const movement of ordered) {
    const previousStock = cumulative;
    cumulative += movement.quantityDelta;
    stockChanges.push({
      previousStock,
      newStock: cumulative,
      reason: movement.reason,
      createdAt: movement.createdAt,
    });
  }
  return {
    id: offer.id,
    productId: offer.productId,
    product: offer.product,
    price: offer.priceKopecks,
    stock,
    minQuantity: offer.minQuantity,
    badge: offer.badge,
    isPerishable: offer.isPerishable,
    archivedAt: offer.archivedAt,
    priceHistory: offer.priceHistory.map((h) => ({
      price: h.priceKopecks,
      createdAt: h.createdAt,
    })),
    stockChanges: stockChanges.reverse().slice(0, 20),
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  };
}

@Injectable()
export class SellerService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------
  // Products
  // -------------------------------------------------------------------

  async listProducts(
    seller: SellerContext,
    options: { archived?: boolean },
  ) {
    const archived = options.archived ?? false;
    const products = await this.prisma.product.findMany({
      where: {
        organizationId: seller.organizationId,
        ...(archived
          ? { archivedAt: { not: null } }
          : { archivedAt: null }),
      },
      include: productInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return products.map(productView);
  }

  async createProduct(seller: SellerContext, dto: ProductDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new ApiError(
        404,
        'CATEGORY_NOT_FOUND',
        'Категория не найдена',
      );
    }
    const product = await this.prisma.product.create({
      data: {
        name: dto.title,
        subtitle: dto.subtitle ?? null,
        description: dto.description ?? '',
        categoryId: dto.categoryId,
        unit: dto.unit,
        organizationId: seller.organizationId,
      },
      include: productInclude,
    });
    return productView(product);
  }

  /** Товар организации продавца или 404. */
  private async ownProduct(seller: SellerContext, id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (
      !product ||
      product.organizationId !== seller.organizationId
    ) {
      throw new NotFoundException('Товар не найден');
    }
    return product;
  }

  async updateProduct(
    seller: SellerContext,
    id: string,
    dto: UpdateProductDto,
  ) {
    await this.ownProduct(seller, id);
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        select: { id: true },
      });
      if (!category) {
        throw new ApiError(
          404,
          'CATEGORY_NOT_FOUND',
          'Категория не найдена',
        );
      }
    }
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { name: dto.title } : {}),
        ...(dto.subtitle !== undefined
          ? { subtitle: dto.subtitle || null }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.categoryId !== undefined
          ? { categoryId: dto.categoryId }
          : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
      },
      include: productInclude,
    });
    return productView(product);
  }

  /** Soft-delete: archivedAt, товар уходит из каталога и поиска. */
  async archiveProduct(seller: SellerContext, id: string) {
    await this.ownProduct(seller, id);
    const product = await this.prisma.product.update({
      where: { id },
      data: { archivedAt: new Date() },
      include: productInclude,
    });
    return productView(product);
  }

  // -------------------------------------------------------------------
  // Offers
  // -------------------------------------------------------------------

  async listOffers(
    seller: SellerContext,
    options: {
      archived?: boolean;
      search?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const archived = options.archived ?? false;
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 20));
    const search = options.search?.trim();

    const where: Prisma.ProductOfferWhereInput = {
      organizationId: seller.organizationId,
      ...(archived
        ? { archivedAt: { not: null } }
        : { archivedAt: null }),
      ...(search
        ? { product: { name: { contains: search, mode: 'insensitive' } } }
        : {}),
    };

    const [total, offers] = await this.prisma.$transaction([
      this.prisma.productOffer.count({ where }),
      this.prisma.productOffer.findMany({
        where,
        include: offerInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: offers.map(offerView),
      total,
      page,
      pageSize,
    };
  }

  async getOffer(seller: SellerContext, id: string) {
    const offer = await this.prisma.productOffer.findUnique({
      where: { id },
      include: offerInclude,
    });
    if (
      !offer ||
      offer.organizationId !== seller.organizationId
    ) {
      throw new NotFoundException('Предложение не найдено');
    }
    return offerView(offer);
  }

  async createOffer(seller: SellerContext, dto: OfferDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, images: true, archivedAt: true },
    });
    if (!product) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Товар не найден');
    }
    if (product.archivedAt) {
      throw new ApiError(
        409,
        'PRODUCT_ARCHIVED',
        'Товар в архиве — сначала восстановите его',
      );
    }

    const offer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.productOffer.create({
        data: {
          productId: dto.productId,
          organizationId: seller.organizationId,
          priceKopecks: dto.price,
          minQuantity: dto.minQuantity ?? 1,
          badge: dto.badge ?? null,
          isPerishable: dto.isPerishable ?? false,
        },
      });
      // Начальная цена — первая запись истории.
      await tx.offerPriceHistory.create({
        data: {
          offerId: created.id,
          priceKopecks: dto.price,
          actorId: seller.userId,
        },
      });
      // Начальный остаток — INITIAL-движение на default-складе
      // (Промт 11: склад создаётся лениво при первом движении).
      if (dto.stock > 0) {
        const locationId = await ensureDefaultLocation(
          tx,
          seller.organizationId,
        );
        await applyMovement(tx, {
          offerId: created.id,
          locationId,
          type: 'INITIAL',
          quantity: dto.stock,
          reason: 'Начальный остаток при создании предложения',
          actorId: seller.userId,
          refType: 'initial',
          refId: created.id,
        });
      }
      if (dto.images?.length) {
        const images = parseImages(product.images);
        const merged = [...new Set([...images, ...dto.images])].slice(0, 6);
        await tx.product.update({
          where: { id: dto.productId },
          data: { images: JSON.stringify(merged) },
        });
      }
      return created;
    });

    return this.getOffer(seller, offer.id);
  }

  async updateOffer(
    seller: SellerContext,
    id: string,
    dto: UpdateOfferDto,
  ) {
    const existing = await this.prisma.productOffer.findUnique({
      where: { id },
    });
    if (
      !existing ||
      existing.organizationId !== seller.organizationId
    ) {
      throw new NotFoundException('Предложение не найдено');
    }
    const currentStock = await totalsOf(this.prisma, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.productOffer.update({
        where: { id },
        data: {
          ...(dto.price !== undefined && dto.price !== existing.priceKopecks
            ? { priceKopecks: dto.price }
            : {}),
          ...(dto.minQuantity !== undefined
            ? { minQuantity: dto.minQuantity }
            : {}),
          ...(dto.badge !== undefined
            ? { badge: dto.badge || null }
            : {}),
          ...(dto.isPerishable !== undefined
            ? { isPerishable: dto.isPerishable }
            : {}),
        },
      });
      if (dto.price !== undefined && dto.price !== existing.priceKopecks) {
        await tx.offerPriceHistory.create({
          data: {
            offerId: id,
            priceKopecks: dto.price,
            actorId: seller.userId,
          },
        });
      }
      // Смена остатка — корректировка (дельта со знаком) на
      // default-складе (Промт 11: инвентаризация может показать
      // недостачу — минус допустим).
      if (dto.stock !== undefined && dto.stock !== currentStock.availableQty) {
        const delta = dto.stock - currentStock.availableQty;
        const locationId = await ensureDefaultLocation(
          tx,
          seller.organizationId,
        );
        await applyMovement(tx, {
          offerId: id,
          locationId,
          type: 'ADJUSTMENT',
          quantity: delta,
          reason:
            dto.stockReason?.trim() || 'Корректировка остатка предложения',
          actorId: seller.userId,
          refType: 'manual',
          refId: id,
        });
      }
      if (dto.images?.length) {
        const product = await tx.product.findUnique({
          where: { id: existing.productId },
          select: { images: true },
        });
        const images = parseImages(product?.images ?? '[]');
        const merged = [...new Set([...images, ...dto.images])].slice(0, 6);
        await tx.product.update({
          where: { id: existing.productId },
          data: { images: JSON.stringify(merged) },
        });
      }
    });

    return this.getOffer(seller, id);
  }

  /** Удаление: нет заказов — физически, есть — архив. */
  async deleteOffer(seller: SellerContext, id: string) {
    const existing = await this.prisma.productOffer.findUnique({
      where: { id },
      include: {
        _count: { select: { orderItems: true } },
        stockBalances: true,
      },
    });
    if (
      !existing ||
      existing.organizationId !== seller.organizationId
    ) {
      throw new NotFoundException('Предложение не найдено');
    }
    if (existing._count.orderItems > 0) {
      // Архив: доступный остаток списывается (WRITE_OFF по каждому
      // складу), резервы живут до отмены заказов (Промт 11).
      await this.prisma.$transaction(async (tx) => {
        await tx.productOffer.update({
          where: { id },
          data: { archivedAt: new Date() },
        });
        for (const balance of existing.stockBalances) {
          if (balance.availableQty > 0) {
            await applyMovement(tx, {
              offerId: id,
              locationId: balance.locationId,
              type: 'WRITE_OFF',
              quantity: balance.availableQty,
              reason: 'Архив предложения',
              actorId: seller.userId,
              refType: 'manual',
              refId: id,
            });
          }
        }
      });
      return { archived: true };
    }
    // Корзины ссылаются на оффер — чистим позиции перед удалением;
    // движения и балансы оффера удаляются вместе с ним (журнал
    // оффера без заказов самостоятельной ценности не имеет).
    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { offerId: id } });
      await tx.stockMovement.deleteMany({ where: { offerId: id } });
      await tx.stockBalance.deleteMany({ where: { offerId: id } });
      await tx.productOffer.delete({ where: { id } });
    });
    return { archived: false };
  }
}
