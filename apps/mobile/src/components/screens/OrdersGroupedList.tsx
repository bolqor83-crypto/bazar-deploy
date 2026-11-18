/**
 * OrdersGroupedList — сгруппированный по контрагенту список
 * заказов (Промт 15, Часть E).
 *
 * Общая часть экранов заказов покупателя/точки/продавца:
 * группы OrderPartyGroup (по продавцу или покупателю), свёрнутые
 * по умолчанию без активных, состояние expanded — локальный Map
 * по id контрагента (не персистится). Фильтрация происходит
 * ДО группировки (экран фильтрует запрос), суммы и счётчики —
 * по отфильтрованному набору. Группировка — только представление:
 * в БД заказы не сливаются (Промт 9).
 */
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { OrderCard, OrderPartyGroup, useTheme } from '@bazar/ui';
import type { Order } from '@bazar/types';
import { groupOrdersByParty, type OrderParty } from '../../utils/groupOrders';

export interface OrdersGroupedListProps<T extends Order> {
  /** Заказы (уже отфильтрованные экраном по статусу);
   *  SellerOrder у продавца — расширяет Order покупателем. */
  orders: T[];
  /** Контрагент для группировки: продавец (вид покупателя/точки)
   *  или покупатель (вид продавца). */
  getParty: (order: T) => OrderParty;
  /** Переход к деталям заказа. */
  onOpenOrder: (orderId: string) => void;
  /** Префикс testID карточек. */
  testIDPrefix: string;
}

export function OrdersGroupedList<T extends Order>({
  orders,
  getParty,
  onOpenOrder,
  testIDPrefix,
}: OrdersGroupedListProps<T>) {
  const { spacing } = useTheme();
  // Пользовательские переключения свёрнутости: party.id → state.
  const [overrides, setOverrides] = useState<Map<string, boolean>>(
    () => new Map(),
  );

  const groups = useMemo(
    () => groupOrdersByParty(orders, getParty),
    [orders, getParty],
  );

  // Дефолт свёрнутости: hasActive → развёрнута; пользовательский
  // выбор перекрывает дефолт (для знакомых групп — sticky).
  const effective = useMemo(() => {
    const merged = new Map<string, boolean>();
    for (const group of groups) {
      const stored = overrides.get(group.party.id);
      merged.set(
        group.party.id,
        stored === undefined ? group.hasActive : stored,
      );
    }
    return merged;
  }, [groups, overrides]);

  const toggle = (partyId: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      const current = effective.get(partyId) ?? false;
      next.set(partyId, !current);
      return next;
    });
  };

  return (
    <View style={{ gap: spacing.xl }}>
      {groups.map((group, groupIndex) => (
        <OrderPartyGroup
          key={group.party.id}
          party={group.party}
          count={group.count}
          activeCount={group.activeCount}
          totalSum={group.totalSum}
          expanded={effective.get(group.party.id) ?? group.hasActive}
          onToggle={() => toggle(group.party.id)}
          testID={`orders-group-${groupIndex}`}
        >
          {group.orders.map((order, index) => (
            <OrderCard
              key={order.id}
              number={order.number}
              status={order.status}
              createdAt={order.createdAt}
              itemCount={order.items.length}
              items={order.items.map((item) => ({
                title: item.title,
                quantity: item.quantity,
                unit: item.unit,
              }))}
              totalKopecks={order.total}
              partyName={group.party.name}
              onPress={() => onOpenOrder(order.id)}
              testID={`${testIDPrefix}-card-${groupIndex}-${index}`}
            />
          ))}
        </OrderPartyGroup>
      ))}
    </View>
  );
}
