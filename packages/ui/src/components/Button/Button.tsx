/**
 * Button — основная кнопка Bazar.
 *
 * Правила:
 * - Размеры: sm 40 / md 48 / lg 56 по высоте; зоны нажатия ≥ 48×48.
 * - loading — три пульсирующие точки (спиннеры запрещены).
 * - disabled — прозрачность 0.5, без хаптики, без нажатий.
 */
import { useEffect, type ReactNode } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { hapticTap } from '../../tokens';
import { Text } from '../Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

const SIZES: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; gap: number }
> = {
  sm: { height: 40, paddingHorizontal: 16, gap: 6 },
  md: { height: 48, paddingHorizontal: 20, gap: 8 },
  lg: { height: 56, paddingHorizontal: 24, gap: 8 },
};

/** Компенсация зоны нажатия до 48×48 для маленькой кнопки. */
const HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Растянуть на всю ширину контейнера (alignSelf: stretch). */
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children?: ReactNode;
  testID?: string;
}

/** Одна пульсирующая точка индикатора загрузки. */
function Dot({ index, color }: { index: number; color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Ступенчатая пульсация: точки «бегут» по очереди.
    opacity.value = withRepeat(
      withDelay(index * 140, withTiming(0.25, { duration: 420 })),
      -1,
      true,
    );
  }, [index, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 3, backgroundColor: color },
        style,
      ]}
    />
  );
}

/** Индикатор загрузки: три точки, без спиннера. */
function LoadingDots({ color }: { color: string }) {
  return (
    <View
      style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}
      accessible
      accessibilityLabel="Загрузка"
    >
      <Dot index={0} color={color} />
      <Dot index={1} color={color} />
      <Dot index={2} color={color} />
    </View>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  onPress,
  children,
  testID,
}: ButtonProps) {
  const { colors, radii } = useTheme();
  const sizeToken = SIZES[size];

  const palette: Record<ButtonVariant, { bg: string; fg: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    secondary: { bg: colors.primarySoft, fg: colors.primaryText },
    ghost: { bg: 'transparent', fg: colors.primaryText },
    destructive: { bg: colors.danger, fg: colors.onDanger },
  };
  const { bg, fg } = palette[variant];

  const handlePress = () => {
    if (disabled || loading) return;
    hapticTap();
    onPress?.();
  };

  const containerStyle: StyleProp<ViewStyle> = {
    height: sizeToken.height,
    paddingHorizontal: sizeToken.paddingHorizontal,
    borderRadius: radii.sm,
    backgroundColor: bg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: sizeToken.gap,
    opacity: disabled ? 0.5 : 1,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      testID={testID}
      disabled={disabled || loading}
      hitSlop={size === 'sm' ? HIT_SLOP : undefined}
      onPress={handlePress}
      style={({ pressed }) => [
        containerStyle,
        pressed && !disabled ? { opacity: 0.85 } : null,
      ]}
    >
      {loading ? (
        <LoadingDots color={fg} />
      ) : (
        <Text
          variant={size === 'sm' ? 'bodySmall' : 'bodyStrong'}
          style={{ color: fg }}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}
