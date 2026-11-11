/**
 * OnboardingHeader — шапка экранов онбординга.
 *
 * Кнопка «Назад» (48×48) слева, заголовок и индикатор шагов.
 * На первом шаге (роль) кнопки «Назад» нет — возвращение на
 * приветствие не предусматривается, шаги идут только вперёд.
 */
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Text, useTheme } from '@bazar/ui';
import type { OnboardingStep } from '@bazar/types';
import { StepIndicator } from './StepIndicator';

export interface OnboardingHeaderProps {
  title: string;
  step: OnboardingStep;
  /** Показывать ли кнопку «Назад» (нет на первом шаге). */
  canBack?: boolean;
}

export function OnboardingHeader({
  title,
  step,
  canBack = true,
}: OnboardingHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {canBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Назад"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => router.back()}
          style={{
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={26} color={colors.text} />
        </Pressable>
      ) : (
        <View style={{ width: 48, height: 48 }} />
      )}
      <View style={{ flex: 1, gap: 8 }}>
        <Text variant="h2" numberOfLines={1}>
          {title}
        </Text>
        <StepIndicator step={step} />
      </View>
    </View>
  );
}
