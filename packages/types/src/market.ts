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
