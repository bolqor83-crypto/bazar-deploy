/**
 * IconButton — квадратная кнопка с иконкой.
 *
 * Размеры: sm 44 / md 48 / lg 56. hitSlop 8 добирает зону до ≥48×48.
 * accessibilityLabel обязателен: у иконочной кнопки нет текста.
 */
import type { ReactNode } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { hapticTap } from '../../tokens';

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonVariant = 'default' | 'ghost' | 'destructive';

const SIZES: Record<IconButtonSize, number> = { sm: 44, md: 48, lg: 56 };
const HIT_SLOP = 8;

export interface IconButtonProps {
  /** Иконка lucide. */
  icon: LucideIcon;
  /** Обязательная метка для доступности. */
  accessibilityLabel: string;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  disabled?: boolean;
  /** Встроенный отклик hapticTap. Отключите, если нужна другая хаптика снаружи. */
  haptic?: boolean;
  onPress?: () => void;
  children?: ReactNode;
}

export function IconButton({
  icon: Icon,
  accessibilityLabel,
  size = 'md',
  variant = 'default',
  disabled = false,
  haptic = true,
  onPress,
}: IconButtonProps) {
  const { colors } = useTheme();
  const box = SIZES[size];
  const iconSize = size === 'lg' ? 26 : size === 'sm' ? 20 : 22;

  const fg =
    variant === 'destructive' ? colors.danger : variant === 'ghost' ? colors.textSecondary : colors.text;

  const containerStyle: StyleProp<ViewStyle> = {
    width: box,
    height: box,
    borderRadius: box / 2,
    backgroundColor: variant === 'ghost' ? 'transparent' : colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
  };

  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      hapticTap();
    }
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      onPress={handlePress}
      style={({ pressed }) => [containerStyle, pressed && !disabled ? { opacity: 0.7 } : null]}
    >
      <View accessible={false}>
        <Icon size={iconSize} color={fg} />
      </View>
    </Pressable>
  );
}
