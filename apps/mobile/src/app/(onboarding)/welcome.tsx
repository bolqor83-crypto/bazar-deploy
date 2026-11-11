/**
 * Приветственный экран онбординга.
 *
 * Показывается аутентифицированному пользователю без членств
 * (OnboardingGuard). Кнопка «Начать настройку» переводит на первый
 * шаг — выбор роли. Прогресс прошлых попыток сохраняется и подставляется
 * в формы соответствующих шагов.
 */
import { Sprout } from 'lucide-react-native';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Text, hapticSelection, useTheme } from '@bazar/ui';
import { useOnboardingStore } from '../../stores/onboardingStore';

export default function OnboardingWelcomeScreen() {
  const start = useOnboardingStore((s) => s.start);
  const { colors, spacing } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxl,
        gap: spacing.lg,
      }}
    >
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel="Иллюстрация: росток"
      >
        <Sprout size={64} color={colors.primary} />
      </View>

      <Text variant="h1" align="center">
        Добро пожаловать в Bazar
      </Text>
      <Text variant="body" color="textSecondary" align="center">
        Расскажите, чем вы занимаетесь: это определит экраны приложения.
        Магазин, опт или доставку можно настроить за пару минут — переключение
        контекстов доступно в любой момент.
      </Text>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onPress={() => {
          hapticSelection();
          start();
          router.push('/role');
        }}
      >
        Начать настройку
      </Button>
    </View>
  );
}
