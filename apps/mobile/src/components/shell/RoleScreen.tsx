/**
 * RoleScreen — экран роли: RoleShell + конфигурация навигации
 * из контекста. Каждая заглушка оборачивается в этот компонент,
 * чтобы не дублировать связывание таб-бара с маршрутами.
 *
 * Промт 9, Часть D: для покупателя в таб «Корзина» подставляется
 * badge с количеством позиций (useCartBadge — живые данные).
 */
import { useMemo, type ReactNode } from 'react';
import type { Role } from '@bazar/types';
import { useCartBadge } from '../../hooks/useCart';
import { RoleShell } from './RoleShell';
import { useRoleNavigation } from './useRoleNavigation';

export interface RoleScreenProps {
  role: Role;
  /** Ключ активного раздела (подсветка вкладки). */
  section: string;
  title: string;
  children?: ReactNode;
}

export function RoleScreen({
  role,
  section,
  title,
  children,
}: RoleScreenProps) {
  const { tabItems, moreItems, onTabChange } = useRoleNavigation(role);
  const cartBadge = useCartBadge(role);

  const itemsWithBadge = useMemo(() => {
    if (cartBadge <= 0) {
      return tabItems;
    }
    return tabItems.map((item) =>
      item.key === 'cart' ? { ...item, badge: cartBadge } : item,
    );
  }, [tabItems, cartBadge]);

  return (
    <RoleShell
      title={title}
      tabItems={itemsWithBadge}
      activeTabKey={section}
      onTabChange={onTabChange}
      moreItems={moreItems}
    >
      {children}
    </RoleShell>
  );
}
