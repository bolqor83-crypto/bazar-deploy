/**
 * Тесты утилиты группировки заказов (Промт 15, Часть E).
 *
 * Чистые функции: группировка по контрагенту, сортировка групп
 * (активные выше, затем свежесть), сортировка внутри, totalSum
 * без CANCELLED, activeCount, склонения.
 */
import {
  groupOrdersByParty,
  pluralAktivnyh,
  pluralZakazov,
  type GroupableOrder,
} from './groupOrders';

function order(partial: Partial<GroupableOrder>): GroupableOrder {
  return {
    id: 'o1',
    status: 'CONFIRMED',
    total: 100_000,
    createdAt: '2026-11-16T08:00:00Z',
    ...partial,
  };
}

describe('groupOrdersByParty (Промт 15, E)', () => {
  it('группирует заказы по контрагенту', () => {
    const groups = groupOrdersByParty(
      [
        order({ id: 'a1', total: 10 }),
        order({ id: 'b1', total: 20 }),
        order({ id: 'a2', total: 30 }),
      ],
      (o) => ({ id: `party-${o.id[0]}`, name: o.id[0] === 'a' ? 'А' : 'Б' }),
    );
    expect(groups).toHaveLength(2);
    const a = groups.find((g) => g.party.id === 'party-a');
    expect(a?.orders.map((o) => o.id)).toEqual(['a1', 'a2']);
    expect(a?.count).toBe(2);
  });

  it('сортирует группы: активные выше, затем свежесть', () => {
    const groups = groupOrdersByParty(
      [
        // Завершённая группа, самая свежая дата.
        order({
          id: 'done',
          status: 'COMPLETED',
          createdAt: '2026-11-18T10:00:00Z',
        }),
        // Активная группа, дата старее.
        order({
          id: 'active',
          status: 'PREPARING',
          createdAt: '2026-11-15T10:00:00Z',
        }),
        // Завершённая группа, старая дата.
        order({
          id: 'old-done',
          status: 'CANCELLED',
          createdAt: '2026-11-01T10:00:00Z',
        }),
      ],
      (o) => ({ id: `p-${o.id}`, name: o.id }),
    );
    expect(groups.map((g) => g.party.id)).toEqual([
      'p-active',
      'p-done',
      'p-old-done',
    ]);
  });

  it('внутри группы заказы по createdAt DESC', () => {
    const groups = groupOrdersByParty(
      [
        order({ id: 'old', createdAt: '2026-11-01T10:00:00Z' }),
        order({ id: 'new', createdAt: '2026-11-17T10:00:00Z' }),
        order({ id: 'mid', createdAt: '2026-11-10T10:00:00Z' }),
      ],
      () => ({ id: 'p', name: 'P' }),
    );
    expect(groups[0]?.orders.map((o) => o.id)).toEqual(['new', 'mid', 'old']);
    expect(groups[0]?.latestCreatedAt).toBe('2026-11-17T10:00:00Z');
  });

  it('totalSum — без CANCELLED', () => {
    const groups = groupOrdersByParty(
      [
        order({ id: 'ok1', total: 500_000, status: 'COMPLETED' }),
        order({ id: 'ok2', total: 300_000, status: 'CONFIRMED' }),
        order({ id: 'cancel', total: 999_999, status: 'CANCELLED' }),
      ],
      () => ({ id: 'p', name: 'P' }),
    );
    expect(groups[0]?.totalSum).toBe(800_000);
  });

  it('activeCount считает PENDING/CONFIRMED/PREPARING/READY', () => {
    const groups = groupOrdersByParty(
      [
        order({ id: '1', status: 'PENDING' }),
        order({ id: '2', status: 'CONFIRMED' }),
        order({ id: '3', status: 'PREPARING' }),
        order({ id: '4', status: 'READY' }),
        order({ id: '5', status: 'COMPLETED' }),
        order({ id: '6', status: 'CANCELLED' }),
      ],
      () => ({ id: 'p', name: 'P' }),
    );
    expect(groups[0]?.activeCount).toBe(4);
    expect(groups[0]?.hasActive).toBe(true);
  });

  it('группа без активных заказов свёрнута по умолчанию (hasActive=false)', () => {
    const groups = groupOrdersByParty(
      [order({ status: 'COMPLETED' }), order({ status: 'CANCELLED' })],
      () => ({ id: 'p', name: 'P' }),
    );
    expect(groups[0]?.hasActive).toBe(false);
  });

  it('пустой список — пустой результат', () => {
    expect(groupOrdersByParty([], () => ({ id: 'p', name: 'P' }))).toEqual([]);
  });
});

describe('склонения (Промт 15, E)', () => {
  it('pluralZakazov: 1 заказ / 2 заказа / 5 заказов / 11 заказов', () => {
    expect(pluralZakazov(1)).toBe('заказ');
    expect(pluralZakazov(2)).toBe('заказа');
    expect(pluralZakazov(5)).toBe('заказов');
    expect(pluralZakazov(11)).toBe('заказов');
    expect(pluralZakazov(21)).toBe('заказ');
    expect(pluralZakazov(22)).toBe('заказа');
  });

  it('pluralAktivnyh: 1 активный / 2 активных', () => {
    expect(pluralAktivnyh(1)).toBe('активный');
    expect(pluralAktivnyh(2)).toBe('активных');
    expect(pluralAktivnyh(5)).toBe('активных');
  });
});
