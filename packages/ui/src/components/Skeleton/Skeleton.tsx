/**
 * Skeleton — скелетон загрузки (спиннеры запрещены).
 *
 * Shimmer: полупрозрачная полоса проезжает по блоку (Reanimated).
 * При prefers-reduced-motion — статичный блок.
 * Скелетон скрыт от служб доступности и не содержит текста.
 */
import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  /** Радиус скругления. По умолчанию — sm (12). */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

const SHIMMER_WIDTH = 96;
const CYCLE_MS = 1200;

export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const { colors, radii } = useTheme();
  const reducedMotion = useReducedMotion() ?? false;
  const progress = useSharedValue(0);

  const animate = !reducedMotion;

  useEffect(() => {
    if (animate) {
      progress.value = withRepeat(withTiming(1, { duration: CYCLE_MS }), -1, false);
    } else {
      cancelAnimation(progress);
      progress.value = 0;
    }
    return () => cancelAnimation(progress);
  }, [animate, progress]);

  // Полоса-блик смещается слева направо по прогрессу.
  const shimmerStyle = useAnimatedStyle(() => {
    if (!animate) {
      return { opacity: 0 };
    }
    const total = (typeof width === 'number' ? width : 320) + SHIMMER_WIDTH;
    const offset = -SHIMMER_WIDTH + progress.value * total;
    return { transform: [{ translateX: offset }] };
  });

  const containerStyle: StyleProp<ViewStyle> = {
    width,
    height,
    borderRadius: radius ?? radii.sm,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  };

  return (
    <View
      style={[containerStyle, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {animate ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: SHIMMER_WIDTH,
              backgroundColor: 'rgba(255, 255, 255, 0.35)',
            },
            shimmerStyle,
          ]}
        />
      ) : null}
    </View>
  );
}
