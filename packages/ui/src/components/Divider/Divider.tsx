/**
 * Divider — разделитель.
 *
 * Горизонтальный или вертикальный, толщина 1px,
 * отступы (inset) только для горизонтального.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerInset = 'none' | 'sm' | 'md' | 'lg';

const INSETS: Record<DividerInset, number | undefined> = {
  none: undefined,
  sm: 8,
  md: 12,
  lg: 16,
};

export interface DividerProps {
  orientation?: DividerOrientation;
  inset?: DividerInset;
  style?: StyleProp<ViewStyle>;
}

export function Divider({ orientation = 'horizontal', inset = 'none', style }: DividerProps) {
  const { colors } = useTheme();
  const insetValue = INSETS[inset];

  const base: ViewStyle = {
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  };

  const lineStyle: ViewStyle =
    orientation === 'horizontal'
      ? {
          height: 1,
          ...(insetValue !== undefined ? { marginHorizontal: insetValue } : {}),
        }
      : {
          width: 1,
          alignSelf: 'stretch',
        };

  return <View style={[base, lineStyle, style]} />;
}
