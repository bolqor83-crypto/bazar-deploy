/**
 * Точка входа «/»: редирект на первый экран активной роли.
 * Пока контекст не гидратирован — скелетон (не спиннер).
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Skeleton, useTheme } from '@bazar/ui';
import { useContextStore } from '../../stores/contextStore';
import { firstRouteFor } from '../../components/shell/navigation';

export default function TabsIndex() {
  const router = useRouter();
  const hydrated = useContextStore((s) => s.hydrated);
  const role = useContextStore((s) => s.active.role);
  const { colors, spacing } = useTheme();

  useEffect(() => {
    if (hydrated) {
      router.replace(firstRouteFor(role));
    }
  }, [hydrated, role, router]);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          padding: spacing.xl,
          gap: spacing.md,
        }}
      >
        <Skeleton height={28} width={200} />
        <Skeleton height={16} width="70%" />
      </View>
    );
  }

  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
