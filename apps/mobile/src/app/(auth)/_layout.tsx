/**
 * Layout зоны входа (auth): стек экранов аутентификации.
 *
 * Вся группа закрыта AuthGuard в режиме «только для гостей» —
 * аутентифицированный пользователь уводится на /(tabs).
 *
 * Исключение — /welcome: экран онбординга нужен уже вошедшему
 * пользователю без организаций, guard для него не применяется
 * (сам welcome проверяет состояние и редиректит).
 */
import { Stack, usePathname } from 'expo-router';
import { useTheme } from '@bazar/ui';
import { AuthGuard } from '../../components/guards/AuthGuard';

export default function AuthLayout() {
  const { colors } = useTheme();
  const pathname = usePathname();

  const stack = (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );

  if (pathname === '/welcome') {
    return stack;
  }

  return <AuthGuard requireAuth={false}>{stack}</AuthGuard>;
}
