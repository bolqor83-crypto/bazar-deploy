/**
 * Онбординг-заглушка: приветствие пользователя без организаций.
 *
 * Показывается после регистрации (у нового пользователя нет ни
 * одной организации). Кнопка «Продолжить» ведёт в приложение с ролью
 * покупателя. Полноценный онбординг (создание организаций и точек) —
 * Промт 5.
 */
import { Redirect, router } from 'expo-router';
import { Sprout } from 'lucide-react-native';
import { EmptyState, useTheme } from '@bazar/ui';
import { useAuth } from '../../hooks/useAuth';
import { useContextStore } from '../../stores/contextStore';

export default function WelcomeScreen() {
  const { state, user } = useAuth();
  const setRole = useContextStore((s) => s.setRole);
  const { spacing } = useTheme();

  // Гостю здесь делать нечего; с организациями — сразу в приложение.
  if (state === 'unauthenticated') {
    return <Redirect href="/login" />;
  }
  if (state === 'unknown') {
    return null;
  }
  if (user && user.memberships.length > 0) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <EmptyState
      icon={Sprout}
      title="Добро пожаловать в Bazar"
      description="Расскажите о своей сфере: магазин, опт или доставка. Настройка займёт пару минут."
      action={{
        label: 'Продолжить',
        onPress: () => {
          // Пока — вход покупателем. Полноценный онбординг — Промт 5.
          setRole('customer');
          router.replace('/(tabs)');
        },
      }}
      style={{ padding: spacing.xxl }}
    />
  );
}
