/**
 * Layout оболочки (tabs): стек экранов без нативных заголовков —
 * шапку и таб-бар рисует RoleShell на каждом экране.
 * Точку входа «/» обслуживает index.tsx с редиректом по роли.
 */
import { Stack } from 'expo-router';
import { useTheme } from '@bazar/ui';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
