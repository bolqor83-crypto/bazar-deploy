/**
 * OnboardingGuard — защита зоны онбординга (onboarding).
 *
 * - unauthenticated → /login (вход только для аутентифицированных).
 * - есть членства → /(tabs): онбординг не нужен, зацикливание
 *   с AuthGuard исключено (см. ADR 0005).
 * - unknown — скелетон, не спиннер.
 */
import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { Skeleton, useTheme } from '@bazar/ui';
import { useAuthStore } from '../../stores/authStore';

export interface OnboardingGuardProps {
  children: ReactNode;
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
      <Skeleton height={24} width={200} />
      <Skeleton height={16} width="70%" />
      <Skeleton height={16} width="50%" />
    </View>
  );
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const authState = useAuthStore((s) => s.state);
  const user = useAuthStore((s) => s.user);

  if (authState === 'unknown') {
    return <GuardSkeleton />;
  }

  if (authState !== 'authenticated') {
    return <Redirect href="/login" />;
  }

  if ((user?.memberships.length ?? 0) > 0) {
    return <Redirect href="/(tabs)" />;
  }

  return children;
}
