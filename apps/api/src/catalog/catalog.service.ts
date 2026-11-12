/**
 * Сервис каталога: категории, список товаров, деталь, предложения.
 *
 * Демо-объём каталога (десятки товаров) позволяет держать поиск,
 * фильтры и сортировку в памяти сервиса: честный lower() для кириллицы
 * (SQLite LIKE не регистронезависим для не-ASCII) и прозрачные тесты.
 * Полноценный полнотекстовый поиск и SQL-агрегации — Промт 9
 * (PostgreSQL), здесь только задел: методы принимают фильтры явно.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../common/filters/api-error';
import type { CatalogSort } from './dto/list-products.query';

/** Товар с категорией и предложениями (внутреннее представление). */
interface ProductWithRelations {
  id: string;
  name: string;
  unit: string;
  description: string;
  images: string;
  categoryId: string;
  category: { id: string; slug: string; name: string; icon: string };
  offers: {
    id: string;
    priceKopecks: number;
    stock: number;
    minQuantity: number;
    badge: string | null;
    isPerishable: boolean;
    organizationId: string;
    organization: { id: string; name: string };
  }[];
}

export interface OfferView {
  id: string;
  priceKopecks: number;
  stock: number;
  minQuantity: number;
  badge: string | null;
  isPerishable: boolean;
  organization: { id: string; name: string };
}

export interface CategoryView {
  id: string;
  slug: string;
  name: string;
  icon: string;
  productCount: number;
}

export interface ProductSummaryView {
  id: string;
  name: string;
  unit: string;
  description: string;
  category: { slug: string; name: string };
  images: string[];
  bestOffer: OfferView | null;
  offersCount: number;
}

export interface ProductDetailView {
  id: string;
  name: string;
  unit: string;
  description: string;
  category: { slug: string; name: string };
  images: string[];
  offers: OfferView[];
}

export interface ProductListView {
  items: ProductSummaryView[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ListProductsFilter {
  category?: string;
  q?: string;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
  minPrice?: number;
  maxPrice?: number;
}

/** Дешёвое предложение товара (минимальная цена, сырая запись). */
function bestOfferOf(
  product: ProductWithRelations,
): ProductWithRelations['offers'][number] | null {
  if (product.offers.length === 0) {
    return null;
  }
  const sorted = [...product.offers].sort(
    (a, b) => a.priceKopecks - b.priceKopecks,
  );
  return sorted[0];
}

/** JSON-массив картинок → строковый массив (битый JSON → []). */
function parseImages(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : [];
  } catch {
    return [];
  }
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Категории по sortOrder с числом товаров. */
  async categories(): Promise<CategoryView[]> {
    const [categories, products] = await Promise.all([
      this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.product.findMany({ select: { categoryId: true } }),
    ]);
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
    }
    return categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      icon: category.icon,
      productCount: counts.get(category.id) ?? 0,
    }));
  }

  /**
   * Список товаров: фильтры (категория, поиск, цена), сортировка
   * (popular = больше предложений выше, затем по алфавиту), пагинация.
   */
  async list(filter: ListProductsFilter): Promise<ProductListView> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 10;
    const sort: CatalogSort = filter.sort ?? 'popular';

    const products = (await this.prisma.product.findMany({
      where: filter.category
        ? { category: { slug: filter.category } }
        : undefined,
      include: { category: true, offers: { include: { organization: true } } },
    })) as ProductWithRelations[];

    const needle = filter.q?.trim().toLowerCase() ?? '';
    const minKopecks = (filter.minPrice ?? 0) * 100 || null;
    const maxKopecks =
      filter.maxPrice !== undefined ? filter.maxPrice * 100 : null;

    let rows = products.map((product) => ({
      product,
      best: bestOfferOf(product),
    }));
    if (needle) {
      rows = rows.filter(
        ({ product }) =>
          product.name.toLowerCase().includes(needle) ||
          product.description.toLowerCase().includes(needle),
      );
    }

    if (minKopecks !== null || maxKopecks !== null) {
      rows = rows.filter(({ best }) => {
        if (!best) {
          return false;
        }
        if (minKopecks !== null && best.priceKopecks < minKopecks) {
          return false;
        }
        if (maxKopecks !== null && best.priceKopecks > maxKopecks) {
          return false;
        }
        return true;
      });
    }

    rows.sort((a, b) => {
      switch (sort) {
        case 'price-asc': {
          const pa = a.best?.priceKopecks ?? Number.MAX_SAFE_INTEGER;
          const pb = b.best?.priceKopecks ?? Number.MAX_SAFE_INTEGER;
          return pa - pb || a.product.name.localeCompare(b.product.name, 'ru');
        }
        case 'price-desc': {
          const pa = a.best?.priceKopecks ?? -1;
          const pb = b.best?.priceKopecks ?? -1;
          return pb - pa || a.product.name.localeCompare(b.product.name, 'ru');
        }
        case 'name':
          return a.product.name.localeCompare(b.product.name, 'ru');
        case 'popular':
        default:
          return (
            b.product.offers.length - a.product.offers.length ||
            a.product.name.localeCompare(b.product.name, 'ru')
          );
      }
    });

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const slice = rows.slice(start, start + pageSize);

    return {
      items: slice.map(({ product, best }) => this.toSummary(product, best)),
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total,
    };
  }

  /** Деталь товара с предложениями по возрастанию цены. */
  async detail(id: string): Promise<ProductDetailView> {
    const product = (await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, offers: { include: { organization: true } } },
    })) as ProductWithRelations | null;

    if (!product) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Товар не найден');
    }

    return {
      id: product.id,
      name: product.name,
      unit: product.unit,
      description: product.description,
      category: {
        slug: product.category.slug,
        name: product.category.name,
      },
      images: parseImages(product.images),
      offers: [...product.offers]
        .sort((a, b) => a.priceKopecks - b.priceKopecks)
        .map((offer) => this.toOfferView(offer)),
    };
  }

  /** Предложения товара (дешёвое первым). */
  async offers(id: string): Promise<{ items: OfferView[] }> {
    const product = (await this.prisma.product.findUnique({
      where: { id },
      include: { offers: { include: { organization: true } } },
    })) as ProductWithRelations | null;

    if (!product) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Товар не найден');
    }

    return {
      items: [...product.offers]
        .sort((a, b) => a.priceKopecks - b.priceKopecks)
        .map((offer) => this.toOfferView(offer)),
    };
  }

  private toOfferView(
    offer: ProductWithRelations['offers'][number],
  ): OfferView {
    return {
      id: offer.id,
      priceKopecks: offer.priceKopecks,
      stock: offer.stock,
      minQuantity: offer.minQuantity,
      badge: offer.badge,
      isPerishable: offer.isPerishable,
      organization: {
        id: offer.organization.id,
        name: offer.organization.name,
      },
    };
  }

  private toSummary(
    product: ProductWithRelations,
    best: ProductWithRelations['offers'][number] | null,
  ): ProductSummaryView {
    return {
      id: product.id,
      name: product.name,
      unit: product.unit,
      description: product.description,
      category: {
        slug: product.category.slug,
        name: product.category.name,
      },
      images: parseImages(product.images),
      bestOffer: best ? this.toOfferView(best) : null,
      offersCount: product.offers.length,
    };
  }
}
