/**
 * Оболочка экранов онбординга: safe area + скролл (клавиатура
 * не перекрывает поля) + шапка с индикатором шагов.
 */
import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@bazar/ui';
import type { OnboardingStep } from '@bazar/types';
import { OnboardingHeader } from './OnboardingHeader';

export interface OnboardingShellProps {
  title: string;
  step: OnboardingStep;
  canBack?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function OnboardingShell({
  title,
  step,
  canBack = true,
  children,
  style,
}: OnboardingShellProps) {
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: spacing.xl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <OnboardingHeader title={title} step={step} canBack={canBack} />
        <View style={[{ gap: spacing.lg }, style]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
