/**
 * AuthGuard — защита маршрутов по состоянию аутентификации.
 *
 * - requireAuth: защищённая зона ((tabs)): без сессии → /login.
 * - !requireAuth: зона входа ((auth)): с сессией → /(tabs).
 * - state 'unknown' (сессия ещё проверяется) — скелетон, не спиннер.
 */
import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { Skeleton, useTheme } from '@bazar/ui';
import { useAuthStore } from '../../stores/authStore';

export interface AuthGuardProps {
  children: ReactNode;
  /** true — маршрут требует сессию; false — только для гостей. */
  requireAuth: boolean;
}

/** Заглушка на время проверки сессии. */
function GuardSkeleton() {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.xl,
        gap: spacing.md,
      }}
      accessibilityLabel="Проверяем сессию"
    >
      <Skeleton height={24} width={180} />
      <Skeleton height={16} width="70%" />
      <Skeleton height={16} width="50%" />
    </View>
  );
}

export function AuthGuard({ children, requireAuth }: AuthGuardProps) {
  const authState = useAuthStore((s) => s.state);

  if (authState === 'unknown') {
    return <GuardSkeleton />;
  }

  if (requireAuth && authState !== 'authenticated') {
    return <Redirect href="/login" />;
  }

  if (!requireAuth && authState === 'authenticated') {
    return <Redirect href="/(tabs)" />;
  }

  return children;
}
