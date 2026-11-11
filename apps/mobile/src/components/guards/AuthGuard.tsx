/**
 * AuthGuard — защита маршрутов по состоянию аутентификации.
 *
 * - requireAuth: защищённая зона ((tabs)): без сессии → /login.
 * - !requireAuth: зона входа ((auth)): с сессией → /(tabs) или /welcome.
 *
 * Пост-аутентификационная маршрутизация (фикс Бага №2, ADR 0005):
 * guard — единственный «маршрутизатор» после входа. Пользователь
 * без членств (свежая регистрация, вход по OTP новым номером)
 * уходит на онбординг /welcome, а не в приложение. Экраны входа
 * сами навигацию не выполняют — иначе возникает гонка между
 * Redirect guard'а и router.replace экрана.
 *
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
  const user = useAuthStore((s) => s.user);

  if (authState === 'unknown') {
    return <GuardSkeleton />;
  }

  if (requireAuth && authState !== 'authenticated') {
    return <Redirect href="/login" />;
  }

  if (!requireAuth && authState === 'authenticated') {
    // Без членств — на онбординг; с членствами — в приложение.
    const hasMemberships = (user?.memberships.length ?? 0) > 0;
    return <Redirect href={hasMemberships ? '/(tabs)' : '/welcome'} />;
  }

  return children;
}
