/**
 * Тесты аналитики рынка — AI Layer 0 (Промт 18, Часть C).
 *
 * Prisma замокан точечно: проверяется агрегация, кэш и детекция
 * аномалий (Z-score) на детерминированных данных.
 */
import {
  MarketAnalyticsService,
  zScore,
} from '../../src/market/analytics.service';
import { PrismaService } from '../../src/prisma/prisma.service';

/** Форма мока: только используемые сервисом модели и методы. */
interface PrismaMock {
  productOffer: { findMany: jest.Mock };
  offerPriceHistory: { findMany: jest.Mock };
  orderItem: { groupBy: jest.Mock; findMany: jest.Mock };
  order: { findMany: jest.Mock };
  membership: { findMany: jest.Mock };
}

function makeService(overrides: Partial<PrismaMock> = {}) {
  const prisma: PrismaMock = {
    productOffer: { findMany: jest.fn().mockResolvedValue([]) },
    offerPriceHistory: { findMany: jest.fn().mockResolvedValue([]) },
    orderItem: {
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    order: { findMany: jest.fn().mockResolvedValue([]) },
    membership: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
  const service = new MarketAnalyticsService(
    prisma as unknown as PrismaService,
  );
  service.cacheTtlMs = 60_000;
  return { service, prisma: prisma as PrismaMock };
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

describe('MarketAnalyticsService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-20T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getPriceTrends', () => {
    it('средняя цена и число офферов по категориям, сортировка по имени', async () => {
      const { service, prisma } = makeService({
        productOffer: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'o1',
              priceKopecks: 8000,
              product: {
                categoryId: 'veg',
                category: { id: 'veg', name: 'Овощи' },
              },
            },
            {
              id: 'o2',
              priceKopecks: 10_000,
              product: {
                categoryId: 'veg',
                category: { id: 'veg', name: 'Овощи' },
              },
            },
            {
              id: 'o3',
              priceKopecks: 12_000,
              product: {
                categoryId: 'fruit',
                category: { id: 'fruit', name: 'Фрукты' },
              },
            },
          ]),
        },
      });

      const result = await service.getPriceTrends(undefined, 'week');

      expect(result.period).toBe('week');
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        categoryName: 'Овощи',
        avgPriceKopecks: 9000,
        offers: 2,
      });
      expect(result.items[1]).toMatchObject({
        categoryName: 'Фрукты',
        avgPriceKopecks: 12_000,
        offers: 1,
      });
      // Фильтр: только активные офферы без POR.
      expect(prisma.productOffer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            archivedAt: null,
            priceOnRequest: false,
          }),
        }),
      );
    });

    it('changePercent: цена до окна ниже текущей → рост', async () => {
      const { service } = makeService({
        productOffer: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'o1',
              priceKopecks: 12_000,
              product: {
                categoryId: 'veg',
                category: { id: 'veg', name: 'Овощи' },
              },
            },
          ]),
        },
        offerPriceHistory: {
          findMany: jest.fn().mockResolvedValue([
            {
              offerId: 'o1',
              priceKopecks: 10_000,
              createdAt: daysAgo(10),
            },
            {
              offerId: 'o1',
              priceKopecks: 9000,
              createdAt: daysAgo(12),
            },
          ]),
        },
      });

      const result = await service.getPriceTrends(undefined, 'week');
      // (12000 − 10000) / 10000 = +20%.
      expect(result.items[0]?.changePercent).toBe(20);
    });

    it('без истории цен changePercent = null (не выдумываем)', async () => {
      const { service } = makeService({
        productOffer: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'o1',
              priceKopecks: 12_000,
              product: {
                categoryId: 'veg',
                category: { id: 'veg', name: 'Овощи' },
              },
            },
          ]),
        },
      });

      const result = await service.getPriceTrends(undefined, 'week');
      expect(result.items[0]?.changePercent).toBeNull();
    });

    it('фильтр по категории передаётся в запрос', async () => {
      const { service, prisma } = makeService();
      await service.getPriceTrends('veg', 'month');
      expect(prisma.productOffer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product: { categoryId: 'veg' },
          }),
        }),
      );
    });
  });

  describe('getVolumeTrends', () => {
    it('суммы, число заказов и изменение к прошлому окну', async () => {
      const { service } = makeService({
        orderItem: {
          groupBy: jest
            .fn()
            .mockResolvedValueOnce([
              {
                offerId: 'o1',
                _sum: { quantity: 150 },
                _count: { orderId: 6 },
              },
            ])
            .mockResolvedValueOnce([
              { offerId: 'o1', _sum: { quantity: 100 } },
            ]),
          findMany: jest.fn().mockResolvedValue([]),
        },
        productOffer: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'o1',
              product: { id: 'p1', name: 'Помидоры', unit: 'кг' },
            },
          ]),
        },
      });

      const result = await service.getVolumeTrends('week');

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        productName: 'Помидоры',
        unit: 'кг',
        quantity: 150,
        ordersCount: 6,
        changePercent: 50,
      });
    });

    it('пустое прошлое окно → changePercent = null', async () => {
      const { service } = makeService({
        orderItem: {
          groupBy: jest
            .fn()
            .mockResolvedValueOnce([
              {
                offerId: 'o1',
                _sum: { quantity: 10 },
                _count: { orderId: 1 },
              },
            ])
            .mockResolvedValueOnce([]),
          findMany: jest.fn().mockResolvedValue([]),
        },
        productOffer: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'o1',
              product: { id: 'p1', name: 'Огурцы', unit: 'кг' },
            },
          ]),
        },
      });

      const result = await service.getVolumeTrends('week');
      expect(result.items[0]?.changePercent).toBeNull();
    });
  });

  describe('getActiveUsers', () => {
    it('группировка по ролям, покупатели без членств — customer, total', async () => {
      const { service } = makeService({
        order: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { buyerId: 'u1' },
              { buyerId: 'u2' },
              { buyerId: 'u3' },
            ]),
        },
        membership: {
          findMany: jest.fn().mockResolvedValue([
            { role: 'STORE_OWNER', userId: 'u1' },
            { role: 'WHOLESALE_SELLER', userId: 'u2' },
          ]),
        },
      });

      const result = await service.getActiveUsers('week');

      expect(result.total).toBe(3);
      const byRole = new Map(result.items.map((i) => [i.role, i.count]));
      expect(byRole.get('STORE_OWNER')).toBe(1);
      expect(byRole.get('WHOLESALE_SELLER')).toBe(1);
      expect(byRole.get('customer')).toBe(1);
    });

    it('нет заказов — пустой ответ', async () => {
      const { service } = makeService();
      const result = await service.getActiveUsers('day');
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getAnomalies', () => {
    it('volume_spike: всплеск последнего дня детектируется', async () => {
      const { service } = makeService({
        orderItem: {
          groupBy: jest.fn().mockResolvedValue([]),
          findMany: jest.fn().mockResolvedValue([
            // База с вариативностью: 8, 12 (mean 10, std 2)…
            buildVolumeItem('p1', 1, 8),
            buildVolumeItem('p1', 2, 12),
            // …и всплеск сегодня: z = (40 − 10) / 2 = 15.
            buildVolumeItem('p1', 0, 40),
          ]),
        },
      });

      const result = await service.getAnomalies('week');

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        type: 'volume_spike',
        entity: 'Помидоры',
        value: 40,
      });
      expect(Math.abs(result.items[0]?.zScore ?? 0)).toBeGreaterThan(2);
    });

    it('ровный ряд без дисперсии — аномалий нет', async () => {
      const { service } = makeService({
        orderItem: {
          groupBy: jest.fn().mockResolvedValue([]),
          findMany: jest
            .fn()
            .mockResolvedValue([
              buildVolumeItem('p1', 0, 10),
              buildVolumeItem('p1', 1, 10),
              buildVolumeItem('p1', 2, 10),
            ]),
        },
      });

      const result = await service.getAnomalies('week');
      expect(result.items).toHaveLength(0);
    });

    it('меньше 3 дней данных — ряда недостаточно, аномалий нет', async () => {
      const { service } = makeService({
        orderItem: {
          groupBy: jest.fn().mockResolvedValue([]),
          findMany: jest
            .fn()
            .mockResolvedValue([
              buildVolumeItem('p1', 0, 10),
              buildVolumeItem('p1', 2, 100),
            ]),
        },
      });

      const result = await service.getAnomalies('week');
      expect(result.items).toHaveLength(0);
    });
  });

  describe('кэш', () => {
    it('повторный вызов не ходит в БД, пока жив TTL', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const { service } = makeService({
        productOffer: { findMany },
      });

      await service.getPriceTrends(undefined, 'week');
      await service.getPriceTrends(undefined, 'week');
      expect(findMany).toHaveBeenCalledTimes(1);

      // Другой ключ — снова в БД.
      await service.getPriceTrends(undefined, 'month');
      expect(findMany).toHaveBeenCalledTimes(2);

      // TTL истёк — пересчёт.
      jest.advanceTimersByTime(61_000);
      await service.getPriceTrends(undefined, 'week');
      expect(findMany).toHaveBeenCalledTimes(3);

      // Явный сброс.
      service.clearCache();
      await service.getPriceTrends(undefined, 'week');
      expect(findMany).toHaveBeenCalledTimes(4);
    });
  });

  describe('zScore', () => {
    it('константа → null, малая выборка → null', () => {
      expect(zScore(5, [5, 5, 5])).toBeNull();
      expect(zScore(5, [1])).toBeNull();
    });

    it('значение выше среднего — положительный z', () => {
      const z = zScore(10, [1, 2, 3]);
      expect(z).not.toBeNull();
      expect(z as number).toBeGreaterThan(2);
    });
  });
});

/** Позиция заказа для мока orderItem.findMany. */
function buildVolumeItem(
  productId: string,
  daysAgoN: number,
  quantity: number,
) {
  return {
    quantity,
    offer: { product: { id: productId, name: 'Помидоры' } },
    order: { createdAt: daysAgo(daysAgoN) },
  };
}
