/**
 * Модель склада (Промт 11).
 *
 * Отражает контракты /api/stock/*: склады организации, остатки
 * офферов и журнал движений. Event-sourcing: StockMovement —
 * источник правды, StockBalance — денормализованный агрегат
 * (см. ADR 0012). Колонки ProductOffer.stock больше нет.
 */

/** Типы складов. */
export const STOCK_LOCATION_TYPES = ['WAREHOUSE', 'STORE', 'OTHER'] as const;
export type StockLocationType = (typeof STOCK_LOCATION_TYPES)[number];

/** Человекочитаемые названия типов складов. */
export const STOCK_LOCATION_TYPE_LABELS: Record<StockLocationType, string> = {
  WAREHOUSE: 'Склад',
  STORE: 'Торговая точка',
  OTHER: 'Другое',
};

/** Типы движений товара (append-only журнал). */
export const STOCK_MOVEMENT_TYPES = [
  'INITIAL',
  'RECEIPT',
  'SALE_OUT',
  'RETURN_IN',
  'WRITE_OFF',
  'ADJUSTMENT',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'RESERVED',
  'UNRESERVED',
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

/** Человекочитаемые названия движений. */
export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  INITIAL: 'Начальный остаток',
  RECEIPT: 'Приход',
  SALE_OUT: 'Продажа',
  RETURN_IN: 'Возврат',
  WRITE_OFF: 'Списание',
  ADJUSTMENT: 'Корректировка',
  TRANSFER_OUT: 'Перемещение (расход)',
  TRANSFER_IN: 'Перемещение (приход)',
  RESERVED: 'Резерв заказа',
  UNRESERVED: 'Снятие резерва',
};

/** Склад организации. */
export interface StockLocation {
  id: string;
  name: string;
  type: StockLocationType;
  address: string | null;
  isDefault: boolean;
  createdAt: string;
}

/** Ввод создания склада. */
export interface CreateStockLocationInput {
  name: string;
  type: StockLocationType;
  address?: string;
  isDefault?: boolean;
}

/** Ввод обновления склада. */
export interface UpdateStockLocationInput {
  name?: string;
  type?: StockLocationType;
  address?: string | null;
  isDefault?: boolean;
}

/** Остаток оффера на складе (денормализованный агрегат). */
export interface StockBalance {
  offerId: string;
  locationId: string;
  locationName: string;
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
  updatedAt: string;
}

/** Сводный остаток оффера по всем складам организации. */
export interface StockSummary {
  offerId: string;
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
  locationsCount: number;
}

/** Движение товара (запись журнала). */
export interface StockMovement {
  id: string;
  offerId: string;
  offerTitle: string;
  locationId: string;
  locationName: string;
  type: StockMovementType;
  quantityDelta: number;
  reason: string;
  refType: string | null;
  refId: string | null;
  createdAt: string;
}

/** Ввод ручного движения (RECEIPT | WRITE_OFF | ADJUSTMENT). */
export interface CreateStockMovementInput {
  offerId: string;
  locationId?: string;
  type: 'RECEIPT' | 'WRITE_OFF' | 'ADJUSTMENT';
  /** Всегда > 0; для ADJUSTMENT — дельта со знаком (минус = недостача). */
  quantity: number;
  reason: string;
}

/** Ввод перемещения между складами. */
export interface StockTransferInput {
  offerId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  reason: string;
}

/** Страница журнала движений. */
export interface StockMovementList {
  items: StockMovement[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Страница остатков. */
export interface StockBalanceList {
  items: StockBalance[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
