/**
 * Layout зоны онбординга (onboarding): стек экранов настройки.
 *
 * Вся группа закрыта OnboardingGuard: неаутентифицированный → /login,
 * пользователь с членствами → /(tabs). Внутри — шаги выбора роли,
 * создания организации и точки, финальный экран.
 */
import { Stack } from 'expo-router';
import { useTheme } from '@bazar/ui';
import { OnboardingGuard } from '../../components/guards/OnboardingGuard';

export default function OnboardingLayout() {
  const { colors } = useTheme();

  return (
    <OnboardingGuard>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </OnboardingGuard>
  );
}
