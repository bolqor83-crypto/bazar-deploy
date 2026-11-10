/**
 * useRoleNavigation — связывает роль и раздел с конфигурацией
 * навигации: пункты таб-бара, разделы «Ещё» и переходы.
 */
import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import type { Role } from '@bazar/types';
import { ROLE_NAV, routeFor } from './navigation';

export function useRoleNavigation(role: Role) {
  const router = useRouter();
  const { tabs, more } = ROLE_NAV[role];

  const onTabChange = useCallback(
    (key: string) => {
      router.replace(routeFor(role, key));
    },
    [router, role]
  );

  return { tabItems: tabs, moreItems: more, onTabChange };
}
