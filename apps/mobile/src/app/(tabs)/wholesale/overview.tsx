/**
 * Обзор (overview) — экран роли «оптовик».
 *
 * Промт 11b: виджет «Склад» с тремя показателями (позиции, мало,
 * нет) — вход в остатки. Остальные показатели появятся с первыми
 * заказами (обещание с действием).
 */
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, LayoutDashboard, Warehouse } from 'lucide-react-native';
import { Card, EmptyState, Skeleton, Text, useTheme } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import { useStockOverview } from '../../../hooks/useStock';
import { useContextSheetStore } from '../../../stores/contextSheetStore';

export default function OverviewScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const openSheet = useContextSheetStore((s) => s.open);
  const overview = useStockOverview(null);

  return (
    <RoleScreen role="wholesale_seller" section="overview" title="Обзор">
      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: spacing.xl,
          gap: spacing.md,
          flexGrow: 1,
          justifyContent: 'center',
        }}
      >
        {/* Виджет «Склад» (Промт 11b): живые остатки организации. */}
        <Card style={{ padding: spacing.md, gap: spacing.sm }}>
          <Text variant="h3">Склад</Text>
          {overview.isLoading ? (
            <Skeleton height={28} />
          ) : overview.isError ? (
            <Text variant="bodySmall" color="textSecondary">
              Остатки недоступны — проверьте связь
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Metric label="Позиций" value={overview.totals.positions} />
              <Metric
                label="Мало"
                value={overview.totals.low}
                color={overview.totals.low > 0 ? colors.accent : undefined}
              />
              <Metric
                label="Нет"
                value={overview.totals.out}
                color={overview.totals.out > 0 ? colors.danger : undefined}
              />
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Открыть склад"
            onPress={() => router.push('/wholesale/stock')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              minHeight: 44,
              opacity: pressed ? 0.7 : 1,
            })}
            testID="overview-stock-widget"
          >
            <Warehouse size={18} color={colors.primary} />
            <Text variant="bodySmall" color="primaryText" style={{ flex: 1 }}>
              Открыть остатки
            </Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>
        </Card>

        <EmptyState
          icon={LayoutDashboard}
          title="Показатели соберутся с первыми заказами"
          description="Выручка, отгрузки и ключевые клиенты оптовой компании появятся на этом экране."
          action={{ label: 'Переключить контекст', onPress: openSheet }}
        />
      </ScrollView>
    </RoleScreen>
  );
}

/** Показатель виджета. */
function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="h3" mono style={color ? { color } : undefined}>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}
