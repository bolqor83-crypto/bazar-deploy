/**
 * RoleGuard — защита ролевых групп маршрутов.
 *
 * Если активная роль не входит в allowedRoles — редирект на первый
 * экран своей роли (например, покупатель по ссылке /store/purchase
 * попадает на /customer/home).
 */
import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import type { Role } from '@bazar/types';
import { useContextStore } from '../../stores/contextStore';
import { firstRouteFor } from '../shell/navigation';

export interface RoleGuardProps {
  allowedRoles: Role[];
  children: ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const activeRole = useContextStore((s) => s.active.role);

  if (!allowedRoles.includes(activeRole)) {
    return <Redirect href={firstRouteFor(activeRole)} />;
  }

  return children;
}
