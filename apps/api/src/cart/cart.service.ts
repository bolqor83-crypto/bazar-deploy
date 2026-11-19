/**
 * Сервис корзины (Промт 9, Часть D; Промт 16, Часть C).
 *
 * Инварианты:
 * - quantity >= offer.minQuantity (партия продавца);
 * - quantity <= доступного остатка оффера (Промт 11: сумма
 *   availableQty по складам — ADR 0012);
 * - корзина одна на (userId, organizationId) — unique в БД;
 * - при чтении собираются warnings: offer исчез, остаток меньше
 *   сохранённого количества или истёк срок персональной цены;
 * - Промт 16 (C): позиция может быть добавлена по персональному
 *   предложению (priceRequestId) — цена строки = quotedPriceKopecks;
 *   строка «по запросу» без валидного предложения не живёт:
 *   добавление POR-оффера без quote запрещено, истёкший quote —
 *   warning + блок на чекауте (заказы проверяют отдельно).
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Prisma, CartItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { isExpired } from '../price-requests/price-request.service';

/** Вид позиции корзины для клиента. */
export interface CartItemView {
  id: string;
  quantity: number;
  subtotal: number;
  offer: {
    id: string;
    priceKopecks: number | null;
    priceOnRequest: boolean;
    stock: number;
    minQuantity: number;
    product: { id: string; name: string; unit: string };
    organization: { id: string; name: string };
  };
  /** Персональное предложение, по которому позиция в корзине
   * (Промт 16, C): цена строки = quote.priceKopecks. */
  quote: {
    id: string;
    priceKopecks: number;
    expired: boolean;
    validUntil: Date;
  } | null;
}

/** Вид корзины для клиента. */
export interface CartView {
  items: CartItemView[];
  subtotal: number;
  warnings: { itemId: string; message: string }[];
}

/** Доступный остаток оффера: сумма по складам (Промт 11). */
function offerStock(offer: {
  stockBalances?: { availableQty: number }[];
}): number {
  return (offer.stockBalances ?? []).reduce(
    (sum, balance) => sum + balance.availableQty,
    0,
  );
}

const includeOffer = {
  offer: {
    include: {
      product: { select: { id: true, name: true, unit: true } },
      organization: { select: { id: true, name: true } },
      stockBalances: { select: { availableQty: true } },
    },
  },
  // Персональное предложение позиции (Промт 16, C) — отношение
  // CartItem.priceRequest, не оффера.
  priceRequest: true,
} satisfies Prisma.CartItemInclude;

type CartItemWithOffer = CartItem & {
  offer: {
    id: string;
    priceKopecks: number;
    priceOnRequest: boolean;
    stockBalances: { availableQty: number }[];
    minQuantity: number;
    product: { id: string; name: string; unit: string };
    organization: { id: string; name: string };
  };
  priceRequest: {
    id: string;
    quotedPriceKopecks: number | null;
    validUntil: Date | null;
    status: string;
  } | null;
};

/** Позиция с вычисленным остатком (для ответа и проверок). */
type CartItemRow = Omit<CartItemWithOffer, 'offer'> & {
  offer: Omit<CartItemWithOffer['offer'], 'stockBalances'> & {
    stock: number;
  };
};

/** Развернуть позиции: остаток из балансов → поле stock. */
function withStock(items: CartItemWithOffer[]): CartItemRow[] {
  return items.map((item) => {
    const { stockBalances, ...offer } = item.offer;
    return {
      ...item,
      offer: { ...offer, stock: offerStock({ stockBalances }) },
    };
  });
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /** Найти корзину контура пользователя (или null). */
  private async findCart(userId: string, organizationId: string) {
    return this.prisma.cart.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
  }

  /** Собрать view корзины с warnings. */
  async getCart(userId: string, organizationId: string): Promise<CartView> {
    const cart = await this.findCart(userId, organizationId);
    if (!cart) {
      return { items: [], subtotal: 0, warnings: [] };
    }
    const items = withStock(
      (await this.prisma.cartItem.findMany({
        where: { cartId: cart.id },
        include: includeOffer,
        orderBy: { createdAt: 'asc' },
      })) as CartItemWithOffer[],
    );

    const warnings: { itemId: string; message: string }[] = [];
    const views: CartItemView[] = [];
    let subtotal = 0;
    for (const item of items) {
      // Эффективная цена: персональная (если строка по quote),
      // иначе базовая. POR-оффер в корзине всегда со строкой quote
      // (добавление без quote запрещено — см. addItem).
      const quote = item.priceRequest;
      const effectivePrice =
        quote && quote.quotedPriceKopecks !== null
          ? quote.quotedPriceKopecks
          : item.offer.priceKopecks;
      const subtotalKopecks = effectivePrice * item.quantity;
      if (item.offer.stock <= 0) {
        warnings.push({
          itemId: item.id,
          message: 'Товар закончился у продавца',
        });
      } else if (item.quantity > item.offer.stock) {
        warnings.push({
          itemId: item.id,
          message: `В наличии осталось ${item.offer.stock}, в корзине ${item.quantity}`,
        });
      }
      if (quote && isExpired(quote)) {
        warnings.push({
          itemId: item.id,
          message: 'Срок персональной цены истёк — создайте новый запрос',
        });
      }
      subtotal += subtotalKopecks;
      views.push({
        id: item.id,
        quantity: item.quantity,
        subtotal: subtotalKopecks,
        offer: {
          id: item.offer.id,
          priceKopecks: item.offer.priceOnRequest
            ? null
            : item.offer.priceKopecks,
          priceOnRequest: item.offer.priceOnRequest,
          stock: item.offer.stock,
          minQuantity: item.offer.minQuantity,
          product: item.offer.product,
          organization: item.offer.organization,
        },
        quote:
          quote && quote.quotedPriceKopecks !== null
            ? {
                id: quote.id,
                priceKopecks: quote.quotedPriceKopecks,
                expired: isExpired(quote),
                validUntil: quote.validUntil ?? new Date(0),
              }
            : null,
      });
    }
    return { items: views, subtotal, warnings };
  }

  /** Добавить позицию (upsert по offerId).
   *
   * Промт 16 (C): с priceRequestId — по персональному предложению
   * (валидация: свой запрос, ANSWERED, не истёк, оффер совпадает).
   * Смешение режимов одной строки запрещено (QUOTE_CONFLICT):
   * обычная цена и персональная не смешиваются в одной позиции. */
  async addItem(
    userId: string,
    organizationId: string,
    offerId: string,
    quantity: number,
    priceRequestId?: string,
  ): Promise<CartView> {
    const offer = await this.prisma.productOffer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        minQuantity: true,
        organizationId: true,
        priceOnRequest: true,
        stockBalances: { select: { availableQty: true } },
      },
    });
    if (!offer) {
      throw new NotFoundException({
        code: 'OFFER_NOT_FOUND',
        message: 'Предложение не найдено',
      });
    }
    const stock = offerStock(offer);
    if (stock <= 0) {
      throw new BadRequestException({
        code: 'OUT_OF_STOCK',
        message: 'Товар закончился у продавца',
      });
    }
    if (quantity > stock) {
      throw new BadRequestException({
        code: 'STOCK_EXCEEDED',
        message: `В наличии ${stock}`,
      });
    }
    if (quantity < offer.minQuantity) {
      throw new BadRequestException({
        code: 'BELOW_MIN_QUANTITY',
        message: `Минимальная партия — ${offer.minQuantity}`,
      });
    }

    // Валидация персонального предложения (Промт 16, C).
    let quoteId: string | null = null;
    if (priceRequestId) {
      const quote = await this.prisma.priceRequest.findUnique({
        where: { id: priceRequestId },
      });
      if (!quote || quote.buyerId !== userId) {
        throw new NotFoundException({
          code: 'PRICE_REQUEST_NOT_FOUND',
          message: 'Персональное предложение не найдено',
        });
      }
      if (quote.offerId !== offerId) {
        throw new BadRequestException({
          code: 'PRICE_REQUEST_MISMATCH',
          message: 'Предложение относится к другому товару',
        });
      }
      if (quote.status !== 'ANSWERED') {
        throw new BadRequestException({
          code: 'PRICE_REQUEST_NOT_ANSWERED',
          message: 'Продавец ещё не ответил на запрос',
        });
      }
      if (isExpired(quote)) {
        throw new BadRequestException({
          code: 'PRICE_REQUEST_EXPIRED',
          message: 'Срок персональной цены истёк — создайте новый запрос',
        });
      }
      quoteId = quote.id;
    } else if (offer.priceOnRequest) {
      // POR-оффер без персонального предложения — цены у покупателя
      // нет: сначала запрос (базовая цена не покидает сервер).
      throw new BadRequestException({
        code: 'PRICE_REQUIRED',
        message: 'Цена по запросу — сначала получите персональное предложение',
      });
    }

    // Корзина контура создаётся при первом добавлении.
    const cart = await this.prisma.cart.upsert({
      where: { userId_organizationId: { userId, organizationId } },
      create: { userId, organizationId },
      update: {},
    });

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_offerId: { cartId: cart.id, offerId } },
      select: { id: true, priceRequestId: true, quantity: true },
    });
    if (existing) {
      // Одна строка — одна цена: смешение режимов запрещено.
      if (existing.priceRequestId !== quoteId) {
        throw new BadRequestException({
          code: 'QUOTE_CONFLICT',
          message:
            existing.priceRequestId !== null
              ? 'Позиция уже с персональной ценой — сначала удалите её'
              : 'Позиция уже в корзине по обычной цене — сначала удалите её',
        });
      }
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity } },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, offerId, quantity, priceRequestId: quoteId },
      });
    }

    return this.getCart(userId, organizationId);
  }

  /** Изменить количество позиции. */
  async updateItem(
    userId: string,
    organizationId: string,
    itemId: string,
    quantity: number,
  ): Promise<CartView> {
    const item = (await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: { select: { userId: true } },
        offer: {
          select: {
            minQuantity: true,
            stockBalances: { select: { availableQty: true } },
          },
        },
      },
    })) as
      | (CartItem & {
          cart: { userId: string };
          offer: {
            stockBalances: { availableQty: number }[];
            minQuantity: number;
          };
        })
      | null;
    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException({
        code: 'CART_ITEM_NOT_FOUND',
        message: 'Позиция корзины не найдена',
      });
    }
    const stock = offerStock(item.offer);
    if (stock <= 0) {
      throw new BadRequestException({
        code: 'OUT_OF_STOCK',
        message: 'Товар закончился у продавца',
      });
    }
    if (quantity > stock) {
      throw new BadRequestException({
        code: 'STOCK_EXCEEDED',
        message: `В наличии ${stock}`,
      });
    }
    if (quantity < item.offer.minQuantity) {
      throw new BadRequestException({
        code: 'BELOW_MIN_QUANTITY',
        message: `Минимальная партия — ${item.offer.minQuantity}`,
      });
    }
    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
    return this.getCart(userId, organizationId);
  }

  /** Удалить позицию. */
  async removeItem(
    userId: string,
    organizationId: string,
    itemId: string,
  ): Promise<CartView> {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      select: { cart: { select: { userId: true } } },
    });
    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException({
        code: 'CART_ITEM_NOT_FOUND',
        message: 'Позиция корзины не найдена',
      });
    }
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(userId, organizationId);
  }

  /** Очистить корзину контура. */
  async clear(userId: string, organizationId: string): Promise<CartView> {
    const cart = await this.findCart(userId, organizationId);
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return { items: [], subtotal: 0, warnings: [] };
  }
}
