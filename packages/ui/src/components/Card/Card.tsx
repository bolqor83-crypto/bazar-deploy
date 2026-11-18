/**
 * Card — карточка-контейнер.
 *
 * Промт 14b «воздух и свежесть»: четыре варианта вместо трёх —
 * - default — shadow sm, без border: карточки товаров, карусель,
 *   элементы каталога (новый стандарт витрины);
 * - elevated — shadow md: акцентные блоки, модальные подсказки;
 * - outlined — border borderStrong, без shadow: формы, сводки,
 *   профиль — там, где нужна чёткая граница, а не парение;
 * - flat — ни border, ни shadow: контент-блок «часть страницы».
 *
 * Dark-тема: тени невидимы на тёмном (ADR 0002) — default и
 * elevated заменяются границей. При onPress — haptic и лёгкое
 * затухание, роль button; selected (Промт 6) — состояние выбора
 * для выбираемых карточек (например, способ доставки).
 */
import type { ReactNode } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { hapticTap, shadowStyle } from '../../tokens';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat';

export interface CardProps {
  variant?: CardVariant;
  onPress?: () => void;
  /** Признак выбранной карточки (только вместе с onPress). */
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  testID?: string;
}

export function Card({
  variant = 'default',
  onPress,
  selected = false,
  style,
  children,
  testID,
}: CardProps) {
  const { colors, radii, spacing, isDark } = useTheme();

  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
  };

  const byVariant: Record<CardVariant, ViewStyle> = {
    default: isDark
      ? { borderWidth: 1, borderColor: colors.border }
      : { ...shadowStyle('sm', false) },
    elevated: isDark
      ? { borderWidth: 1, borderColor: colors.borderStrong }
      : { ...shadowStyle('md', false) },
    outlined: { borderWidth: 1, borderColor: colors.borderStrong },
    flat: {},
  };

  const cardStyle: StyleProp<ViewStyle> = [base, byVariant[variant], style];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={selected ? { selected: true } : undefined}
        testID={testID}
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

  return (
    <View testID={testID} style={cardStyle}>
      {children}
    </View>
  );
}
