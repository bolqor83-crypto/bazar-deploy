/**
 * Layout зоны входа (auth): стек экранов аутентификации.
 *
 * Вся группа закрыта AuthGuard в режиме «только для гостей».
 * Пост-аутентификационную маршрутизацию выполняет сам guard:
 * с членствами — /(tabs), без членств — онбординг /welcome
 * (группа (onboarding), фикс Бага №2, см. ADR 0005).
 */
import { Stack } from 'expo-router';
import { useTheme } from '@bazar/ui';
import { AuthGuard } from '../../components/guards/AuthGuard';

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <AuthGuard requireAuth={false}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </AuthGuard>
  );
}
