/**
 * StepIndicator — индикатор шагов онбординга (4 точки).
 *
 * Шаги: 1 — роль, 2 — организация, 3 — точка, 4 — готово.
 * Пройденные и текущий — цвет бренда, будущие — приглушённые.
 * Доступность: «Шаг N из 4».
 */
import { View } from 'react-native';
import { useTheme } from '@bazar/ui';
import type { OnboardingStep } from '@bazar/types';

/** Порядок шагов онбординга. */
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  'role',
  'organization',
  'location',
  'done',
];

export interface StepIndicatorProps {
  step: OnboardingStep;
}

export function StepIndicator({ step }: StepIndicatorProps) {
  const { colors } = useTheme();
  const current = ONBOARDING_STEPS.indexOf(step) + 1;
  const total = ONBOARDING_STEPS.length;

  return (
    <View
      style={{ flexDirection: 'row', gap: 8 }}
      accessibilityRole="progressbar"
      accessibilityLabel={`Шаг ${current} из ${total}`}
      accessibilityValue={{ min: 1, max: total, now: current }}
    >
      {ONBOARDING_STEPS.map((s, index) => {
        const reached = index + 1 <= current;
        return (
          <View
            key={s}
            style={{
              width: index + 1 === current ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: reached ? colors.primary : colors.border,
            }}
          />
        );
      })}
    </View>
  );
}
