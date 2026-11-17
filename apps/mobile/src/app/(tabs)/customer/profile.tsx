/**
 * Профиль (profile) — экран роли «покупатель».
 *
 * Карточка пользователя, сводка операций (заказы и сумма —
 * рабочая плотность вместо полупустого экрана, VLM-аудит
 * итерации 3), переход к уведомлениям о заказах и выход
 * из аккаунта с подтверждением.
 */
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight } from 'lucide-react-native';
import { Badge, Card, Text, formatPrice, useTheme } from '@bazar/ui';
import { LogoutSection } from '../../../components/auth/LogoutSection';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import { useUnreadNotificationsCount } from '../../../hooks/useNotifications';
import { useOrders } from '../../../hooks/useOrders';

/** Сводка операций покупателя: два числа на одной панели. */
function OperationsSummary() {
  const { colors, spacing } = useTheme();
  const ordersQuery = useOrders();
  const orders = ordersQuery.data?.items ?? [];
  if (orders.length === 0) {
    return null;
  }
  const totalKopecks = orders.reduce((sum, order) => sum + order.total, 0);
  const inWork = orders.filter(
    (order) => order.status !== 'COMPLETED' && order.status !== 'CANCELLED',
  ).length;

  return (
    <Card testID="profile-operations">
      <Text variant="caption" color="textMuted">
        Операции
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: spacing.sm,
          marginTop: spacing.xs,
        }}
      >
        <Text variant="numberL" color="primaryText">
          {orders.length}
        </Text>
        <Text variant="caption" color="textSecondary" style={{ flexShrink: 1 }}>
          {orders.length === 1 ? 'заказ' : 'заказа'}
          {inWork > 0 ? ` · ${inWork} в работе` : ''}
        </Text>
        <Text variant="numberL">{formatPrice(totalKopecks)}</Text>
        <Text variant="caption" color="textSecondary">
          закуплено
        </Text>
      </View>
    </Card>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const unreadQuery = useUnreadNotificationsCount();
  const unread = unreadQuery.data ?? 0;

  return (
    <RoleScreen role="customer" section="profile" title="Профиль">
      <View style={{ padding: spacing.md, gap: spacing.md, width: '100%' }}>
        <OperationsSummary />
        <Card>
          <Pressable
            testID="profile-notifications"
            accessibilityRole="button"
            accessibilityLabel={
              unread > 0
                ? `Уведомления, непрочитанных: ${unread}`
                : 'Уведомления'
            }
            onPress={() => router.push('/customer/notifications')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              minHeight: 56,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Bell size={22} color={colors.text} />
            <Text variant="body" style={{ flex: 1 }}>
              Уведомления
            </Text>
            {unread > 0 ? (
              <Badge variant="info" size="sm">
                {unread > 99 ? '99+' : String(unread)}
              </Badge>
            ) : null}
            <ChevronRight size={20} color={colors.textSecondary} />
          </Pressable>
        </Card>
        <LogoutSection />
      </View>
    </RoleScreen>
  );
}
