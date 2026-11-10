/**
 * Badge — статусный бейдж.
 *
 * Варианты: neutral / success / warning / danger / info.
 * warning использует янтарь (accent) — красный запрещён.
 * Радиус pill, размеры sm/md.
 */
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../Text';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
}

export function Badge({ variant = 'neutral', size = 'md', children }: BadgeProps) {
  const { colors, radii, spacing } = useTheme();

  const palette: Record<BadgeVariant, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.accentSoft, fg: colors.accent },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
  };
  const { bg, fg } = palette[variant];

  const sizeStyle: ViewStyle =
    size === 'sm'
      ? { paddingHorizontal: spacing.sm, paddingVertical: 2 }
      : { paddingHorizontal: spacing.md, paddingVertical: spacing.xs };

  const containerStyle: StyleProp<ViewStyle> = {
    ...sizeStyle,
    borderRadius: radii.pill,
    backgroundColor: bg,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  };

  return (
    <View style={containerStyle}>
      <Text variant={size === 'sm' ? 'micro' : 'caption'} style={{ color: fg }}>
        {children}
      </Text>
    </View>
  );
}
