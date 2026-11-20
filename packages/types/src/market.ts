/**
 * Модель рынка и маршрута по рынку (Промт 17, Часть B).
 *
 * Демо-модель: рынок — детерминированная сетка «ряды × места».
 * Расстояние между точками — Manhattan по сетке (шаг места 3 м,
 * шаг ряда 8 м: проход + глубина точки). Вход — ряд 0, место 0
 * («Вход/парковка» у края). Реальные координаты и гео-навигация —
 * будущее (ADR 0017); константы собраны в одном месте и легко
 * калибруются.
 *
 * Маршрут строится по активным заказам покупателя (CONFIRMED /
 * PREPARING / READY): оптимизатор обходит точки продавцов от
 * входа с минимальным путём (Held-Karp ≤ 12 точек, дальше
 * эвристика). Схема рынка рисуется как схема метро — без карт.
 */

/** Конфигурация демо-сетки рынка. */
export const MARKET = {
  /** Ряды 1..4. */
  rows: 4,
  /** Места 1..40 в ряду. */
  spots: 40,
  /** Шаг между местами, метров. */
  spotStepMeters: 3,
  /** Шаг между рядами (проход + глубина точки), метров. */
  rowStepMeters: 8,
  /** «Вход/парковка» у края сетки. */
  entrance: { row: 0, spot: 0 },
  /** Скорость пешком с тележкой, м/с (~4,3 км/ч). */
  walkSpeedMps: 1.2,
  /** Максимум остановок в маршруте. */
  maxStops: 20,
  /** Предел точного алгоритма Held-Karp (n ≤ 12 — точно). */
  exactMaxStops: 12,
} as const;

/** Конфигурация сетки рынка. */
export type MarketConfig = typeof MARKET;

/** Точка на сетке рынка (ряд 0 = вход, места от 1). */
export interface MarketPoint {
  row: number;
  spot: number;
}

/** Остановка маршрута: заказ у продавца с позицией на рынке. */
export interface MarketStop {
  orderId: string;
  orderNumber: string;
  seller: { id: string; name: string };
  row: number;
  spot: number;
  status: 'CONFIRMED' | 'PREPARING' | 'READY';
  itemsCount: number;
  /** Итог заказа, копейки. */
  total: number;
  /** Метры от предыдущей точки (у первой — от входа). */
  legMeters: number;
}

/** Заказ продавца без позиции на рынке — в маршрут не входит. */
export interface MarketUnlocatedOrder {
  orderId: string;
  orderNumber: string;
  sellerName: string;
}

/** Ответ GET /api/market/route. */
export interface MarketRouteResponse {
  market: { rows: number; spots: number; entrance: MarketPoint };
  stops: MarketStop[];
  totalMeters: number;
  estimatedMinutes: number;
  returnToStart: boolean;
  /** Метры от последней точки ко входу (при returnToStart). */
  returnLegMeters?: number;
  unlocated: MarketUnlocatedOrder[];
  truncated: boolean;
}

/** Позиция организации на рынке (экран продавца). */
export interface MarketPosition {
  locationId: string;
  name: string;
  marketRow: number;
  marketSpot: number;
}

/** Ввод сохранения позиции на рынке. */
export interface SaveMarketPositionInput {
  marketRow: number;
  marketSpot: number;
}

/*
 * AI Layer 0 — аналитика рынка (Промт 18, Часть C; ADR 0019).
 *
 * Программная агрегация из БД: без LLM, быстро и объяснимо.
 * Контракт зеркалируется на сервере (apps/api/src/market/dto).
 */

/** Окно агрегации. */
export type AnalyticsPeriod = 'day' | 'week' | 'month';

/** Тренд цен по категории (Layer 0). */
export interface PriceTrendItem {
  categoryId: string;
  categoryName: string;
  /** Средняя цена активных офферов, копейки. */
  avgPriceKopecks: number;
  /** Число активных офферов в категории. */
  offers: number;
  /**
   * Изменение к предыдущему окну, % (по истории цен). null —
   * истории нет, изменение неизвестно (не выдумываем).
   */
  changePercent: number | null;
}

/** Ответ GET /api/market/trends. */
export interface PriceTrendsResponse {
  period: AnalyticsPeriod;
  items: PriceTrendItem[];
}

/** Объём заказов по товару (Layer 0). */
export interface VolumeItem {
  productId: string;
  productName: string;
  unit: string;
  /** Суммарное количество за окно. */
  quantity: number;
  /** Заказов с этим товаром за окно. */
  ordersCount: number;
  /** Изменение к предыдущему окну, %; null — в прошлом окне пусто. */
  changePercent: number | null;
}

/** Ответ GET /api/market/volumes. */
export interface VolumesResponse {
  period: AnalyticsPeriod;
  items: VolumeItem[];
}

/** Активные покупатели по ролям (Layer 0, агрегировано). */
export interface ActiveUsersItem {
  role: string;
  count: number;
}

/** Ответ GET /api/market/users. */
export interface ActiveUsersResponse {
  period: AnalyticsPeriod;
  items: ActiveUsersItem[];
  total: number;
}

/** Тип аномалии (Layer 0, Z-score). */
export type AnomalyType =
  'price_spike' | 'price_drop' | 'volume_spike' | 'volume_drop';

/** Аномалия: резкое отклонение от среднего (|z| > 2). */
export interface AnomalyItem {
  type: AnomalyType;
  /** Категория (цены) или товар (объёмы). */
  entity: string;
  /** Текущее значение: цена (копейки) или количество. */
  value: number;
  /** Z-score отклонения. */
  zScore: number;
  unit?: string;
}

/** Ответ GET /api/market/anomalies. */
export interface AnomaliesResponse {
  period: AnalyticsPeriod;
  items: AnomalyItem[];
}
