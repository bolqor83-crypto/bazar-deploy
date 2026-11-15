/**
 * Уведомления пользователя (Промт 10, Часть C).
 *
 * Лента событий заказов: непрочитанные — с точкой-индикатором,
 * прочитанные приглушены. Кнопка «Прочитать все» в шапке,
 * тап по непрочитанному — отметить прочитанным. Загрузка —
 * Skeleton, пусто — EmptyState, ошибка — ErrorState.
 */
import { Pressable, ScrollView, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
  Text,
  useTheme,
} from '@bazar/ui';
import type { NotificationType } from '@bazar/types';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../../hooks/useNotifications';

/** Подпись типа уведомления. */
const TYPE_LABELS: Record<NotificationType, string> = {
  NEW_ORDER: 'Новый заказ',
  ORDER_STATUS: 'Статус заказа',
  ORDER_CANCELLED: 'Отмена',
  NEW_DELIVERY: 'Заявка на доставку',
  DELIVERY_STATUS: 'Статус доставки',
  DELIVERY_CANCELLED: 'Отмена доставки',
  STOCK_WRITE_OFF: 'Списание товара',
  STOCK_EMPTY: 'Товар закончился',
};

/** Формат времени: «13 ноя, 08:30». */
function formatTime(iso: string): string {
  const date = new Date(iso);
  const months = [
    'янв',
    'фев',
    'мар',
    'апр',
    'мая',
    'июн',
    'июл',
    'авг',
    'сен',
    'окт',
    'ноя',
    'дек',
  ];
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${date.getDate()} ${months[date.getMonth()] ?? ''}, ${hh}:${mm}`;
}

function NotificationsSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Skeleton height={72} />
      <Skeleton height={72} />
      <Skeleton height={72} />
    </View>
  );
}

export interface NotificationsScreenProps {
  /** Базовый путь роли — для совместимости навигации. */
  basePath: string;
}

export default function NotificationsScreen({
  basePath,
}: NotificationsScreenProps) {
  const { colors, spacing } = useTheme();
  void basePath;

  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const notifications = notificationsQuery.data?.items ?? [];
  const unread = notificationsQuery.data?.unread ?? 0;

  const onItemPress = (id: string, isRead: boolean) => {
    if (!isRead) {
      markRead.mutate(id);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {unread > 0 ? (
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              gap: spacing.sm,
            }}
          >
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              loading={markAll.isPending}
              onPress={() => markAll.mutate()}
              testID="notifications-read-all"
            >
              {`Прочитать все (${unread})`}
            </Button>
          </View>
        ) : null}

        {notificationsQuery.isError ? (
          <ErrorState
            title="Уведомления не загрузились"
            description="Проверьте соединение и попробуйте снова"
            onRetry={() => void notificationsQuery.refetch()}
          />
        ) : notificationsQuery.isPending ? (
          <NotificationsSkeleton />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Уведомлений нет"
            description="Здесь появятся события заказов: новые заказы, смены статусов и отмены."
            testID="notifications-empty"
          />
        ) : (
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.xl,
              gap: spacing.sm,
            }}
          >
            {notifications.map((notification, index) => {
              const isRead = notification.readAt !== null;
              return (
                <Pressable
                  key={notification.id}
                  testID={`notification-item-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${notification.title}. ${notification.body}`}
                  onPress={() => onItemPress(notification.id, isRead)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: spacing.sm,
                    padding: spacing.md,
                    borderWidth: 1,
                    borderColor: isRead ? colors.border : colors.primary,
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.85 : 1,
                    minHeight: 72,
                  })}
                >
                  {!isRead ? (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: colors.primary,
                        marginTop: 6,
                      }}
                    />
                  ) : (
                    <View style={{ width: 10, marginTop: 6 }} />
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: spacing.sm,
                      }}
                    >
                      <Badge variant="neutral" size="sm">
                        {TYPE_LABELS[notification.type] ?? notification.type}
                      </Badge>
                      <Text variant="caption" color="textSecondary">
                        {formatTime(notification.createdAt)}
                      </Text>
                    </View>
                    <Text
                      variant="body"
                      style={{ opacity: isRead ? 0.7 : 1 }}
                      numberOfLines={2}
                    >
                      {notification.title}
                    </Text>
                    <Text
                      variant="caption"
                      color="textSecondary"
                      numberOfLines={2}
                    >
                      {notification.body}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
