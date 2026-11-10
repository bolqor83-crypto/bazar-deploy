/**
 * RoleScreen — экран роли: RoleShell + конфигурация навигации
 * из контекста. Каждая заглушка оборачивается в этот компонент,
 * чтобы не дублировать связывание таб-бара с маршрутами.
 */
import type { ReactNode } from 'react';
import type { Role } from '@bazar/types';
import { RoleShell } from './RoleShell';
import { useRoleNavigation } from './useRoleNavigation';

export interface RoleScreenProps {
  role: Role;
  /** Ключ активного раздела (подсветка вкладки). */
  section: string;
  title: string;
  children?: ReactNode;
}

export function RoleScreen({ role, section, title, children }: RoleScreenProps) {
  const { tabItems, moreItems, onTabChange } = useRoleNavigation(role);

  return (
    <RoleShell
      title={title}
      tabItems={tabItems}
      activeTabKey={section}
      onTabChange={onTabChange}
      moreItems={moreItems}
    >
      {children}
    </RoleShell>
  );
}
