/**
 * Аналитика рынка — AI Layer 0 (Промт 18, Часть C; ADR 0019).
 *
 * Программная агрегация из БД: тренды цен, объёмы заказов,
 * активность по ролям, аномалии (Z-score > 2). Без LLM:
 * быстро, дёшево, каждый показатель проверяется запросом.
 *
 * Кэш in-memory с TTL: дашборд не должен молотить БД на каждый
 * заход; инстанс один (Render), Redis не нужен. TTL — свойство
 * cacheTtlMs (тесты уменьшают), есть clearCache().
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Окно агреграции — согласовано с packages/types/src/market.ts. */
export type AnalyticsPeriod = 'day' | 'week' | 'month';

/** Тренд цен по категории (зеркало PriceTrendItem из types). */
export interface PriceTrendItem {
  categoryId: string;
  categoryName: string;
  avgPriceKopecks: number;
  offers: number;
  changePercent: number | null;
}

export interface PriceTrendsResponse {
  period: AnalyticsPeriod;
  items: PriceTrendItem[];
}

export interface VolumeItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  ordersCount: number;
  changePercent: number | null;
}

export interface VolumesResponse {
  period: AnalyticsPeriod;
  items: VolumeItem[];
}

export interface ActiveUsersItem {
  role: string;
  count: number;
}

export interface ActiveUsersResponse {
  period: AnalyticsPeriod;
  items: ActiveUsersItem[];
  total: number;
}

export type AnomalyType =
  'price_spike' | 'price_drop' | 'volume_spike' | 'volume_drop';

export interface AnomalyItem {
  type: AnomalyType;
  entity: string;
  value: number;
  zScore: number;
  unit?: string;
}

export interface AnomaliesResponse {
  period: AnalyticsPeriod;
  items: AnomalyItem[];
}

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  day: 1,
  week: 7,
  month: 30,
};

/** Порог аномальности: |z| строго больше. */
const Z_SCORE_THRESHOLD = 2;

/** Минимум точек для ряда (меньше — дисперсия не имеет смысла). */
const MIN_SERIES_POINTS = 3;

/** Окно дня в мс (для группировки по дням). */
const DAY_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

@Injectable()
export class MarketAnalyticsService {
  /** TTL кэша, мс; тесты уменьшают. */
  cacheTtlMs = 5 * 60_000;

  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  /** Кэш с TTL: возвращает вычисленное значение, пока живо. */
  private async cached<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    const now = Date.now();
    if (hit && hit.expiresAt > now) {
      return hit.value as T;
    }
    const value = await compute();
    this.cache.set(key, { value, expiresAt: now + this.cacheTtlMs });
    return value;
  }

  /** Тестам: сброс кэша. */
  clearCache(): void {
    this.cache.clear();
  }

  /** Граница окна (дней назад). */
  private windowStart(period: AnalyticsPeriod): Date {
    return new Date(Date.now() - PERIOD_DAYS[period] * DAY_MS);
  }

  private previousWindowStart(period: AnalyticsPeriod): Date {
    return new Date(Date.now() - 2 * PERIOD_DAYS[period] * DAY_MS);
  }

  /** Сколько дней в окне — столько точек в дневном ряду. */
  private seriesLength(period: AnalyticsPeriod): number {
    return PERIOD_DAYS[period];
  }

  /**
   * Тренды цен по категориям: средняя цена активных офферов
   * сейчас; изменение — против реконструкции цены на начало окна
   * (последняя запись OfferPriceHistory ≤ границы; нет истории —
   * null, изменение не выдумываем).
   */
  async getPriceTrends(
    categoryId?: string,
    period: AnalyticsPeriod = 'week',
  ): Promise<PriceTrendsResponse> {
    const cacheKey = `trends:${categoryId ?? '-'}:${period}`;
    return this.cached(cacheKey, async () => {
      const since = this.windowStart(period);
      const offers = await this.prisma.productOffer.findMany({
        where: {
          archivedAt: null,
          priceOnRequest: false,
          product: categoryId ? { categoryId } : undefined,
        },
        select: {
          id: true,
          priceKopecks: true,
          product: {
            select: {
              categoryId: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      });

      const byCategory = new Map<string, PriceTrendItem & { sum: number }>();
      for (const offer of offers) {
        const cat = offer.product.category;
        const entry =
          byCategory.get(cat.id) ??
          ({
            categoryId: cat.id,
            categoryName: cat.name,
            avgPriceKopecks: 0,
            offers: 0,
            changePercent: null,
            sum: 0,
          } as PriceTrendItem & { sum: number });
        entry.offers += 1;
        entry.sum += offer.priceKopecks;
        byCategory.set(cat.id, entry);
      }

      if (byCategory.size === 0) {
        return { period, items: [] };
      }

      // Реконструкция цен на начало окна по истории изменений.
      const offerIds = offers.map((o) => o.id);
      const history = await this.prisma.offerPriceHistory.findMany({
        where: { offerId: { in: offerIds }, createdAt: { lt: since } },
        select: { offerId: true, priceKopecks: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      const lastBeforeWindow = new Map<string, number>();
      for (const point of history) {
        if (!lastBeforeWindow.has(point.offerId)) {
          lastBeforeWindow.set(point.offerId, point.priceKopecks);
        }
      }

      const prevByCategory = new Map<string, { sum: number; count: number }>();
      const offerToCategory = new Map(
        offers.map((o) => [o.id, o.product.categoryId]),
      );
      for (const [offerId, price] of lastBeforeWindow) {
        const catId = offerToCategory.get(offerId);
        if (!catId) {
          continue;
        }
        const entry = prevByCategory.get(catId) ?? { sum: 0, count: 0 };
        entry.sum += price;
        entry.count += 1;
        prevByCategory.set(catId, entry);
      }

      const items: PriceTrendItem[] = [...byCategory.values()]
        .map((entry) => {
          const avg = Math.round(entry.sum / entry.offers);
          const prev = prevByCategory.get(entry.categoryId);
          let changePercent: number | null = null;
          if (prev && prev.count > 0 && prev.sum > 0) {
            const prevAvg = prev.sum / prev.count;
            changePercent = Math.round(((avg - prevAvg) / prevAvg) * 1000) / 10;
          }
          return {
            categoryId: entry.categoryId,
            categoryName: entry.categoryName,
            avgPriceKopecks: avg,
            offers: entry.offers,
            changePercent,
          };
        })
        .sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'ru'));

      return { period, items };
    });
  }

  /**
   * Объёмы заказов по товарам: сумма quantity OrderItem за окно
   * (отменённые заказы исключены), изменение к предыдущему окну.
   */
  async getVolumeTrends(
    period: AnalyticsPeriod = 'week',
  ): Promise<VolumesResponse> {
    return this.cached(`volumes:${period}`, async () => {
      const since = this.windowStart(period);
      const prevStart = this.previousWindowStart(period);

      const itemWhere = (
        from: Date,
        to?: Date,
      ): Prisma.OrderItemWhereInput => ({
        order: {
          status: { not: 'CANCELLED' },
          createdAt: to ? { gte: from, lt: to } : { gte: from },
        },
      });

      const current = await this.prisma.orderItem.groupBy({
        by: ['offerId'],
        where: itemWhere(since),
        _sum: { quantity: true },
        _count: { orderId: true },
      });
      const previous = await this.prisma.orderItem.groupBy({
        by: ['offerId'],
        where: itemWhere(prevStart, since),
        _sum: { quantity: true },
      });

      const offerIds = new Set([
        ...current.map((c) => c.offerId),
        ...previous.map((p) => p.offerId),
      ]);
      if (offerIds.size === 0) {
        return { period, items: [] };
      }
      const offers = await this.prisma.productOffer.findMany({
        where: { id: { in: [...offerIds] } },
        select: {
          id: true,
          product: { select: { id: true, name: true, unit: true } },
        },
      });
      const offerById = new Map(offers.map((o) => [o.id, o]));

      const prevByOffer = new Map(
        previous.map((p) => [p.offerId, p._sum.quantity ?? 0]),
      );

      const items: VolumeItem[] = current
        .map((row) => {
          const offer = offerById.get(row.offerId);
          const quantity = row._sum.quantity ?? 0;
          const prev = prevByOffer.get(row.offerId);
          let changePercent: number | null = null;
          if (prev !== undefined && prev > 0) {
            changePercent = Math.round(((quantity - prev) / prev) * 1000) / 10;
          }
          return {
            productId: offer?.product.id ?? row.offerId,
            productName: offer?.product.name ?? 'Товар',
            unit: offer?.product.unit ?? '',
            quantity,
            ordersCount: row._count.orderId,
            changePercent,
          };
        })
        .sort((a, b) => b.quantity - a.quantity);

      return { period, items };
    });
  }

  /**
   * Активные покупатели по ролям: distinct пользователи с заказами
   * за окно, агрегировано по их членствам (без персон).
   */
  async getActiveUsers(
    period: AnalyticsPeriod = 'week',
  ): Promise<ActiveUsersResponse> {
    return this.cached(`users:${period}`, async () => {
      const since = this.windowStart(period);
      const buyers = await this.prisma.order.findMany({
        where: { createdAt: { gte: since } },
        select: { buyerId: true },
        distinct: ['buyerId'],
      });
      const buyerIds = buyers.map((b) => b.buyerId);
      if (buyerIds.length === 0) {
        return { period, items: [], total: 0 };
      }
      const memberships = await this.prisma.membership.findMany({
        where: { userId: { in: buyerIds } },
        select: { role: true, userId: true },
      });
      const byRole = new Map<string, Set<string>>();
      const usersWithMembership = new Set<string>();
      for (const m of memberships) {
        const set = byRole.get(m.role) ?? new Set<string>();
        set.add(m.userId);
        byRole.set(m.role, set);
        usersWithMembership.add(m.userId);
      }
      // Покупатели без членств (розничные клиенты) — своя группа.
      const withoutRole = buyerIds.filter((id) => !usersWithMembership.has(id));
      if (withoutRole.length > 0) {
        byRole.set('customer', new Set(withoutRole));
      }
      const items: ActiveUsersItem[] = [...byRole.entries()]
        .map(([role, users]) => ({ role, count: users.size }))
        .sort((a, b) => b.count - a.count);
      return {
        period,
        items,
        total: new Set(buyerIds).size,
      };
    });
  }

  /**
   * Аномалии: Z-score > 2 по дневным рядам за окно.
   * Цены — дневные средние по OfferPriceHistory (+ текущие офферы
   * как «сегодня»); объёмы — дневные суммы quantity по OrderItem.
   * Меньше 3 точек или нулевая дисперсия — аномалий нет.
   */
  async getAnomalies(
    period: AnalyticsPeriod = 'week',
  ): Promise<AnomaliesResponse> {
    return this.cached(`anomalies:${period}`, async () => {
      const since = this.windowStart(period);
      const items: AnomalyItem[] = [];

      // ── Цены: дневные средние по категориям.
      const history = await this.prisma.offerPriceHistory.findMany({
        where: { createdAt: { gte: since } },
        select: {
          priceKopecks: true,
          createdAt: true,
          offer: {
            select: {
              product: {
                select: {
                  categoryId: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      });
      const priceSeries = new Map<string, Map<string, number[]>>();
      const categoryNames = new Map<string, string>();
      for (const point of history) {
        const catId = point.offer.product.categoryId;
        categoryNames.set(catId, point.offer.product.category.name);
        const day = point.createdAt.toISOString().slice(0, 10);
        const series = priceSeries.get(catId) ?? new Map<string, number[]>();
        const list = series.get(day) ?? [];
        list.push(point.priceKopecks);
        series.set(day, list);
        priceSeries.set(catId, series);
      }
      for (const [catId, series] of priceSeries.entries()) {
        if (series.size < MIN_SERIES_POINTS) {
          continue;
        }
        const daily = [...series.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, values]) => {
            const sum = values.reduce((s, v) => s + v, 0);
            return sum / values.length;
          });
        const last = daily[daily.length - 1];
        const baseline = daily.slice(0, -1);
        const z = zScore(last, baseline);
        if (z !== null && Math.abs(z) > Z_SCORE_THRESHOLD) {
          items.push({
            type: z > 0 ? 'price_spike' : 'price_drop',
            entity: categoryNames.get(catId) ?? 'Категория',
            value: Math.round(last),
            zScore: Math.round(z * 100) / 100,
          });
        }
      }

      // ── Объёмы: дневные суммы по товарам.
      const orderItems = await this.prisma.orderItem.findMany({
        where: {
          order: {
            status: { not: 'CANCELLED' },
            createdAt: { gte: since },
          },
        },
        select: {
          quantity: true,
          offer: { select: { product: { select: { id: true, name: true } } } },
          order: { select: { createdAt: true } },
        },
      });
      const volumeSeries = new Map<string, Map<string, number>>();
      const productNames = new Map<string, string>();
      for (const item of orderItems) {
        const productId = item.offer.product.id;
        productNames.set(productId, item.offer.product.name);
        const day = item.order.createdAt.toISOString().slice(0, 10);
        const series = volumeSeries.get(productId) ?? new Map<string, number>();
        series.set(day, (series.get(day) ?? 0) + item.quantity);
        volumeSeries.set(productId, series);
      }
      for (const [productId, series] of volumeSeries) {
        if (series.size < MIN_SERIES_POINTS) {
          continue;
        }
        const daily = [...series.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, value]) => value);
        const last = daily[daily.length - 1];
        const baseline = daily.slice(0, -1);
        const z = zScore(last, baseline);
        if (z !== null && Math.abs(z) > Z_SCORE_THRESHOLD) {
          items.push({
            type: z > 0 ? 'volume_spike' : 'volume_drop',
            entity: productNames.get(productId) ?? 'Товар',
            value: last,
            zScore: Math.round(z * 100) / 100,
          });
        }
      }

      // Сортировка по силе отклонения — сильнейшие первыми.
      items.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
      return { period, items };
    });
  }
}

/**
 * Z-score значения против базовой серии. null — считать нельзя
 * (мало точек или нулевая дисперсия: константа не аномальна).
 */
export function zScore(value: number, baseline: number[]): number | null {
  if (baseline.length < MIN_SERIES_POINTS - 1) {
    return null;
  }
  const mean = baseline.reduce((s, v) => s + v, 0) / baseline.length;
  const variance =
    baseline.reduce((s, v) => s + (v - mean) * (v - mean), 0) / baseline.length;
  const std = Math.sqrt(variance);
  if (std === 0 || !Number.isFinite(std)) {
    return null;
  }
  return (value - mean) / std;
}
