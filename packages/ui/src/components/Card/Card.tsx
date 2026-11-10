/**
 * Card — карточка-контейнер.
 *
 * Варианты: default (фон + граница), elevated (тень md в light,
 * граница в dark), outlined (граница borderStrong).
 * При onPress — haptic и лёгкое затухание, роль button.
 */
import type { ReactNode } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { hapticTap, shadowStyle } from '../../tokens';

export type CardVariant = 'default' | 'elevated' | 'outlined';

export interface CardProps {
  variant?: CardVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function Card({ variant = 'default', onPress, style, children }: CardProps) {
  const { colors, radii, spacing, isDark } = useTheme();

  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  };

  const byVariant: Record<CardVariant, ViewStyle> = {
    default: {},
    elevated: isDark
      ? { borderColor: colors.borderStrong }
      : { ...shadowStyle('md', false), borderWidth: 0 },
    outlined: { borderColor: colors.borderStrong },
  };

  const cardStyle: StyleProp<ViewStyle> = [base, byVariant[variant], style];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          hapticTap();
          onPress();
        }}
        style={({ pressed }) => [cardStyle, pressed ? { opacity: 0.9 } : null]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}
