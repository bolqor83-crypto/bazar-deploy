/**
 * Профиль (profile) — экран роли «покупатель».
 *
 * Карточка пользователя, переход к уведомлениям о заказах
 * (Промт 10, Часть C) и выход из аккаунта с подтверждением.
 */
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight } from 'lucide-react-native';
import { Badge, Card, Text, useTheme } from '@bazar/ui';
import { LogoutSection } from '../../../components/auth/LogoutSection';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import { useUnreadNotificationsCount } from '../../../hooks/useNotifications';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const unreadQuery = useUnreadNotificationsCount();
  const unread = unreadQuery.data ?? 0;

  return (
    <RoleScreen role="customer" section="profile" title="Профиль">
      <View style={{ padding: spacing.md, gap: spacing.md, width: '100%' }}>
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
