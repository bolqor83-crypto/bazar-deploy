/**
 * Сервис корзины (Промт 9, Часть D).
 *
 * Инварианты:
 * - quantity >= offer.minQuantity (партия продавца);
 * - quantity <= offer.stock (склад);
 * - корзина одна на (userId, organizationId) — unique в БД;
 * - при чтении собираются warnings: offer исчез или stock меньше
 *   сохранённого количества — покупатель видит честное состояние.
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Prisma, CartItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Вид позиции корзины для клиента. */
export interface CartItemView {
  id: string;
  quantity: number;
  subtotal: number;
  offer: {
    id: string;
    priceKopecks: number;
    stock: number;
    minQuantity: number;
    product: { id: string; name: string; unit: string };
    organization: { id: string; name: string };
  };
}

/** Вид корзины для клиента. */
export interface CartView {
  items: CartItemView[];
  subtotal: number;
  warnings: { itemId: string; message: string }[];
}

const includeOffer = {
  offer: {
    include: {
      product: { select: { id: true, name: true, unit: true } },
      organization: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.CartItemInclude;

type CartItemWithOffer = CartItem & {
  offer: {
    id: string;
    priceKopecks: number;
    stock: number;
    minQuantity: number;
    product: { id: string; name: string; unit: string };
    organization: { id: string; name: string };
  };
};

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
    const items = (await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: includeOffer,
      orderBy: { createdAt: 'asc' },
    })) as CartItemWithOffer[];

    const warnings: { itemId: string; message: string }[] = [];
    const views: CartItemView[] = [];
    let subtotal = 0;
    for (const item of items) {
      const subtotalKopecks = item.offer.priceKopecks * item.quantity;
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
      subtotal += subtotalKopecks;
      views.push({
        id: item.id,
        quantity: item.quantity,
        subtotal: subtotalKopecks,
        offer: item.offer,
      });
    }
    return { items: views, subtotal, warnings };
  }

  /** Добавить позицию (upsert по offerId). */
  async addItem(
    userId: string,
    organizationId: string,
    offerId: string,
    quantity: number,
  ): Promise<CartView> {
    const offer = await this.prisma.productOffer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        stock: true,
        minQuantity: true,
        organizationId: true,
      },
    });
    if (!offer) {
      throw new NotFoundException({
        code: 'OFFER_NOT_FOUND',
        message: 'Предложение не найдено',
      });
    }
    if (offer.stock <= 0) {
      throw new BadRequestException({
        code: 'OUT_OF_STOCK',
        message: 'Товар закончился у продавца',
      });
    }
    if (quantity > offer.stock) {
      throw new BadRequestException({
        code: 'STOCK_EXCEEDED',
        message: `В наличии ${offer.stock}`,
      });
    }
    if (quantity < offer.minQuantity) {
      throw new BadRequestException({
        code: 'BELOW_MIN_QUANTITY',
        message: `Минимальная партия — ${offer.minQuantity}`,
      });
    }

    // Корзина контура создаётся при первом добавлении.
    const cart = await this.prisma.cart.upsert({
      where: { userId_organizationId: { userId, organizationId } },
      create: { userId, organizationId },
      update: {},
    });

    await this.prisma.cartItem.upsert({
      where: { cartId_offerId: { cartId: cart.id, offerId } },
      create: { cartId: cart.id, offerId, quantity },
      update: { quantity: { increment: quantity } },
    });

    return this.getCart(userId, organizationId);
  }

  /** Изменить количество позиции. */
  async updateItem(
    userId: string,
    organizationId: string,
    itemId: string,
    quantity: number,
  ): Promise<CartView> {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: { select: { userId: true } },
        offer: { select: { stock: true, minQuantity: true } },
      },
    });
    if (!item || item.cart.userId !== userId) {
      throw new NotFoundException({
        code: 'CART_ITEM_NOT_FOUND',
        message: 'Позиция корзины не найдена',
      });
    }
    if (item.offer.stock <= 0) {
      throw new BadRequestException({
        code: 'OUT_OF_STOCK',
        message: 'Товар закончился у продавца',
      });
    }
    if (quantity > item.offer.stock) {
      throw new BadRequestException({
        code: 'STOCK_EXCEEDED',
        message: `В наличии ${item.offer.stock}`,
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
