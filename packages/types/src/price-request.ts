/**
 * Модель запросов цены «по запросу» (Промт 16, Часть C).
 *
 * Покупатель запрашивает цену на оффер с priceOnRequest;
 * продавец отвечает персональным предложением (72 часа) или
 * отклоняет. Корзина и заказ считают по quotedPriceKopecks.
 * См. ADR 0016.
 */

/** Статусы запроса цены (значения enum PriceRequestStatus). */
export const PRICE_REQUEST_STATUSES = [
  'PENDING',
  'ANSWERED',
  'DECLINED',
] as const;
export type PriceRequestStatus = (typeof PRICE_REQUEST_STATUSES)[number];

/** Человеческие подписи статусов запроса цены. */
export const PRICE_REQUEST_STATUS_LABELS: Record<PriceRequestStatus, string> = {
  PENDING: 'Ждёт ответа',
  ANSWERED: 'Предложение готово',
  DECLINED: 'Отклонён',
};

/** Срок действия персонального предложения, часы (ADR 0016). */
export const PRICE_REQUEST_VALIDITY_HOURS = 72;

/** Запрос цены (клиентский вид). */
export interface PriceRequest {
  id: string;
  offerId: string;
  quantity: number;
  message: string | null;
  status: PriceRequestStatus;
  /** Ответ продавца: цена за единицу в копейках (ANSWERED). */
  quotedPriceKopecks: number | null;
  /** Срок действия предложения (ANSWERED). */
  validUntil: string | null;
  /** Истёк ли срок предложения (вычисляется, не хранится). */
  expired: boolean;
  respondedAt: string | null;
  createdAt: string;
  offer: {
    id: string;
    /** Базовая цена: видна только продавцу (у покупателя null). */
    priceKopecks: number | null;
    priceOnRequest: boolean;
    minQuantity: number;
    product: { id: string; name: string; unit: string };
    organization: { id: string; name: string };
  };
  /** Покупатель (виден только продавцу; у покупателя null). */
  buyer?: { id: string; name: string } | null;
}

/** Ввод создания запроса цены. */
export interface CreatePriceRequestInput {
  offerId: string;
  quantity: number;
  message?: string;
}

/** Ответ продавца ценой: цена в копейках за единицу. */
export interface RespondPriceRequestInput {
  price: number;
}

/** Страница списка запросов. */
export interface PriceRequestList {
  items: PriceRequest[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
