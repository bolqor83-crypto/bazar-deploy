/**
 * Группировка заказов по контрагенту (Промт 15, Часть E).
 *
 * Заказы одного продавца (или покупателя — в кабинете продавца)
 * собираются в одну визуальную группу с заголовком. ГРУППИРОВКА —
 * ТОЛЬКО ПРЕДСТАВЛЕНИЕ: в БД заказы не сливаются, правило
 * «один Order = один продавец» (Промт 9) сохраняется.
 *
 * Чистая утилита без зависимостей от React — легко тестировать.
 */

/** Минимальная форма заказа, нужная группировке. */
export interface GroupableOrder {
  id: string;
  status: string;
  /** Итог в копейках. */
  total: number;
  createdAt: string;
}

/** Контрагент группы: продавец (вид покупателя) или покупатель
 *  (вид продавца). */
export interface OrderParty {
  id: string;
  name: string;
}

/** Результат группировки. */
export interface OrderGroup<T extends GroupableOrder> {
  party: OrderParty;
  /** Заказы группы, createdAt по убыванию. */
  orders: T[];
  count: number;
  /** PENDING / CONFIRMED / PREPARING / READY. */
  activeCount: number;
  /** Сумма total БЕЗ отменённых заказов, копейки. */
  totalSum: number;
  /** ISO-дата самого свежего заказа группы. */
  latestCreatedAt: string;
  hasActive: boolean;
}

/** Активные статусы: заказ «в работе». */
const ACTIVE_STATUSES = new Set(['PENDING', 'CONFIRMED', 'PREPARING', 'READY']);

/** Русская плюрализация: «1 заказ / 2 заказа / 5 заказов». */
export function pluralZakazov(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'заказ';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'заказа';
  }
  return 'заказов';
}

/** Русская плюрализация: «1 активный / 2 активных / 5 активных». */
export function pluralAktivnyh(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'активный';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return 'активных';
  }
  return 'активных';
}

/**
 * Группирует заказы по контрагенту.
 *
 * @param orders   заказы (любой формы, расширяющей GroupableOrder);
 * @param getParty функция контрагента заказа: покупатель получает
 *                 продавца, продавец — покупателя.
 *
 * Порядок групп: активные (hasActive) выше, затем самые свежие.
 * Внутри группы — createdAt по убыванию. totalSum — без CANCELLED.
 */
export function groupOrdersByParty<T extends GroupableOrder>(
  orders: readonly T[],
  getParty: (order: T) => OrderParty,
): OrderGroup<T>[] {
  const byParty = new Map<string, { party: OrderParty; orders: T[] }>();

  for (const order of orders) {
    const party = getParty(order);
    let bucket = byParty.get(party.id);
    if (!bucket) {
      bucket = { party, orders: [] };
      byParty.set(party.id, bucket);
    }
    bucket.orders.push(order);
  }

  const groups: OrderGroup<T>[] = [];
  for (const { party, orders: partyOrders } of byParty.values()) {
    // Внутри группы — новые сверху.
    const sorted = [...partyOrders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const activeCount = sorted.filter((order) =>
      ACTIVE_STATUSES.has(order.status),
    ).length;
    const totalSum = sorted
      .filter((order) => order.status !== 'CANCELLED')
      .reduce((sum, order) => sum + order.total, 0);
    groups.push({
      party,
      orders: sorted,
      count: sorted.length,
      activeCount,
      totalSum,
      latestCreatedAt: sorted[0]?.createdAt ?? '',
      hasActive: activeCount > 0,
    });
  }

  // Активные продавцы наверху, завершённые ниже; при равенстве —
  // свежесть последнего заказа.
  groups.sort((a, b) => {
    if (a.hasActive !== b.hasActive) {
      return a.hasActive ? -1 : 1;
    }
    return (
      new Date(b.latestCreatedAt).getTime() -
      new Date(a.latestCreatedAt).getTime()
    );
  });

  return groups;
}
