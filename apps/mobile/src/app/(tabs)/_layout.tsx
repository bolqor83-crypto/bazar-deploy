/**
 * Layout оболочки (tabs): защищённая зона приложения.
 *
 * AuthGuard пускает только аутентифицированных (иначе — /login);
 * пока сессия проверяется — скелетон. Внутри — стек экранов без
 * нативных заголовков: шапку и таб-бар рисует RoleShell.
 * Точку входа «/» обслуживает index.tsx с редиректом по роли.
 */
import { Stack } from 'expo-router';
import { useTheme } from '@bazar/ui';
import { AuthGuard } from '../../components/guards/AuthGuard';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <AuthGuard requireAuth>
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
