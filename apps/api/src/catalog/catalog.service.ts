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
import { resolveProductImages } from './product-photos';
import type { CatalogSort } from './dto/list-products.query';

/** Похожие идентификаторы (cuid, UUID, короткие тестовые id) — всё
 * остальное в excludeId игнорируется (Промт 14a): кириллица,
 * знаки препинания и прочий мусор не должен ломать листинг. */
const ID_PATTERN = /^[0-9a-z][0-9a-z-]{7,63}$/i;

/** Товар с категорией и предложениями (внутреннее представление). */
interface ProductWithRelations {
  id: string;
  name: string;
  unit: string;
  description: string;
  images: string;
  categoryId: string;
  archivedAt: Date | null;
  category: { id: string; slug: string; name: string; icon: string };
  offers: {
    id: string;
    priceKopecks: number;
    priceOnRequest: boolean;
    minQuantity: number;
    badge: string | null;
    isPerishable: boolean;
    archivedAt: Date | null;
    organizationId: string;
    organization: { id: string; name: string };
    /** Остатки по складам организации (Промт 11, ADR 0012). */
    stockBalances: { availableQty: number }[];
  }[];
}

/** Доступный остаток оффера: сумма по складам (Промт 11). */
function offerStock(offer: ProductWithRelations['offers'][number]): number {
  return offer.stockBalances.reduce(
    (sum, balance) => sum + balance.availableQty,
    0,
  );
}

export interface OfferView {
  id: string;
  /** Цена в копейках; null — «цена по запросу» (Промт 16, C:
   * базовая цена не покидает сервер в публичных ответах). */
  priceKopecks: number | null;
  priceOnRequest: boolean;
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
  excludeId?: string;
}

/** FNV-1a 32 бита: детерминированный хэш строки. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Является ли строка похожей на id (cuid/UUID — без дефисов и прочего). */
function looksLikeId(value: string | undefined): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

/** Дешёвое предложение товара (минимальная цена, сырая запись). */
/** Видимые предложения: не в архиве и с доступным остатком
 * (Промт 11: остаток — SUM(availableQty) по складам, нулевой
 * скрывает оффер из каталога). */
function visibleOffers(
  product: ProductWithRelations,
): ProductWithRelations['offers'][number][] {
  return product.offers.filter(
    (offer) => offer.archivedAt === null && offerStock(offer) > 0,
  );
}

function bestOfferOf(
  product: ProductWithRelations,
): ProductWithRelations['offers'][number] | null {
  const visible = visibleOffers(product);
  if (visible.length === 0) {
    return null;
  }
  // Промт 16 (C): «цена по запросу» всегда в конце — лучшее
  // предложение = самая дешёвая ОТКРЫТАЯ цена; если открытых
  // нет, первый POR-оффер (цена null — карточка покажет
  // «Цена по запросу»). Порядок с дешёвкой из pricedFirst().
  return pricedFirst(visible)[0];
}

/** Сортировка офферов: открытые цены по возрастанию, затем
 * «по запросу» (Промт 16, C — ADR 0016: такие офферы всегда
 * в конце ценовых списков). */
function pricedFirst(
  offers: ProductWithRelations['offers'][number][],
): ProductWithRelations['offers'][number][] {
  return [...offers].sort((a, b) => {
    const aPor = a.priceOnRequest ? 1 : 0;
    const bPor = b.priceOnRequest ? 1 : 0;
    if (aPor !== bPor) {
      return aPor - bPor;
    }
    if (aPor === 1) {
      // Оба «по запросу»: стабильный порядок не важен — по id.
      return a.id.localeCompare(b.id);
    }
    return a.priceKopecks - b.priceKopecks;
  });
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
      where: {
        archivedAt: null,
        ...(filter.category ? { category: { slug: filter.category } } : {}),
        // Промт 14a: исключение «себя» из выдачи — валидный id
        // фильтрует на уровне БД, невалидный игнорируется.
        ...(looksLikeId(filter.excludeId)
          ? { id: { not: filter.excludeId } }
          : {}),
      },
      include: {
        category: true,
        offers: {
          include: {
            organization: true,
            stockBalances: { select: { availableQty: true } },
          },
        },
      },
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
      // Промт 16 (C): фильтры цены исключают товары без открытой
      // цены (POR-цена не покидает сервер — сравнивать не с чем).
      rows = rows.filter(({ best }) => {
        if (!best || best.priceOnRequest) {
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
          // Промт 16 (C): POR-товары (без открытой цены) — в конце.
          const pa =
            a.best && !a.best.priceOnRequest
              ? a.best.priceKopecks
              : Number.MAX_SAFE_INTEGER;
          const pb =
            b.best && !b.best.priceOnRequest
              ? b.best.priceKopecks
              : Number.MAX_SAFE_INTEGER;
          return pa - pb || a.product.name.localeCompare(b.product.name, 'ru');
        }
        case 'price-desc': {
          // POR — в конце и по убыванию (цены нет — сравнивать не с чем).
          const pa =
            a.best && !a.best.priceOnRequest ? a.best.priceKopecks : -1;
          const pb =
            b.best && !b.best.priceOnRequest ? b.best.priceKopecks : -1;
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
      include: {
        category: true,
        offers: {
          include: {
            organization: true,
            stockBalances: { select: { availableQty: true } },
          },
        },
      },
    })) as ProductWithRelations | null;

    if (!product || product.archivedAt) {
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
      images: resolveProductImages(product.name, parseImages(product.images)),
      offers: pricedFirst(visibleOffers(product)).map((offer) =>
        this.toOfferView(offer),
      ),
    };
  }

  /** Предложения товара (дешёвое первым). */
  async offers(id: string): Promise<{ items: OfferView[] }> {
    const product = (await this.prisma.product.findUnique({
      where: { id },
      include: {
        offers: {
          include: {
            organization: true,
            stockBalances: { select: { availableQty: true } },
          },
        },
      },
    })) as ProductWithRelations | null;

    if (!product) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Товар не найден');
    }

    return {
      items: pricedFirst(product.offers).map((offer) =>
        this.toOfferView(offer),
      ),
    };
  }

  /**
   * Похожие товары (Промт 14a): сначала та же категория, при нехватке —
   * добор из остальных. Сам товар всегда исключён. Порядок внутри
   * групп — детерминированное «перемешивание» (хэш FNV-1a от пары
   * id): живая витрина без Math.random — golden-скриншоты стабильны.
   *
   * В выдаче только товары с доступным предложением: карточка
   * похожих ведёт на покупку, товар без цены в карусели бесполезен.
   */
  async similar(
    id: string,
    rawLimit?: number,
  ): Promise<{ items: ProductSummaryView[] }> {
    const limit = Math.min(Math.max(Math.trunc(rawLimit ?? 10) || 10, 1), 20);

    const product = (await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, categoryId: true, archivedAt: true },
    })) as { id: string; categoryId: string; archivedAt: Date | null } | null;

    if (!product || product.archivedAt) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Товар не найден');
    }

    const candidates = (await this.prisma.product.findMany({
      where: { archivedAt: null, id: { not: id } },
      include: {
        category: true,
        offers: {
          include: {
            organization: true,
            stockBalances: { select: { availableQty: true } },
          },
        },
      },
    })) as ProductWithRelations[];

    // Кандидат = товар с видимым предложением; сортировка по хэшу
    // пары (id исходного, id кандидата) — стабильно между прогонами.
    const sourceCategoryId = product.categoryId;
    const withBest = candidates
      .map((candidate) => ({
        product: candidate,
        best: bestOfferOf(candidate),
      }))
      .filter(({ best }) => best !== null)
      .map(({ product: candidate, best }) => ({
        product: candidate,
        best,
        rank: fnv1a(`${id}:${candidate.id}`),
        sameCategory: candidate.categoryId === sourceCategoryId ? 1 : 0,
      }));

    withBest.sort((a, b) => {
      // Та же категория — всегда раньше, «перемешивание» — внутри групп.
      if (a.sameCategory !== b.sameCategory) {
        return b.sameCategory - a.sameCategory;
      }
      return a.rank - b.rank;
    });

    return {
      items: withBest
        .slice(0, limit)
        .map(({ product, best }) => this.toSummary(product, best)),
    };
  }

  private toOfferView(
    offer: ProductWithRelations['offers'][number],
  ): OfferView {
    return {
      id: offer.id,
      // Промт 16 (C): базовая цена POR-оффера не покидает сервер —
      // публичный контракт: priceKopecks null + priceOnRequest true.
      priceKopecks: offer.priceOnRequest ? null : offer.priceKopecks,
      priceOnRequest: offer.priceOnRequest,
      stock: offerStock(offer),
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
      images: resolveProductImages(product.name, parseImages(product.images)),
      bestOffer: best ? this.toOfferView(best) : null,
      offersCount: product.offers.length,
    };
  }
}
