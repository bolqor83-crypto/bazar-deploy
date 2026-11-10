/**
 * Dialog — нижний шит (bottom sheet).
 *
 * RN Modal + Reanimated: появление пружиной springBase,
 * закрытие таймингом 220 мс (решение по Промту 2).
 * Верхние углы скруглены (lg), фон backgroundElevated.
 * Drag-to-dismiss за «ручку», тап по подложке — если dismissable.
 * accessibilityViewIsModal для ловушки фокуса.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { durations, hapticSelection, springs } from '../../tokens';
import { Text } from '../Text';

const CLOSE_DURATION = durations.base; // 220 мс
const DISMISS_DRAG_DISTANCE = 80;
const DISMISS_DRAG_VELOCITY = 1.5;
const OFFSCREEN = 600;

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Можно ли закрыть тапом по подложке и жестом. По умолчанию true. */
  dismissable?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function Dialog({ visible, onClose, title, dismissable = true, style, children }: DialogProps) {
  const { colors, radii, spacing } = useTheme();
  const translateY = useSharedValue(OFFSCREEN);
  const [mounted, setMounted] = useState(visible);

  // Монтирование/анимация при открытии и закрытии.
  // Осознанный синхронный setState: шит монтируется строго при visible.
  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- монтаж шита
      setMounted(true);
      translateY.value = OFFSCREEN;
      translateY.value = withSpring(0, springs.base);
    } else if (mounted) {
      translateY.value = withTiming(OFFSCREEN, { duration: CLOSE_DURATION }, (finished) => {
        if (finished) {
          // runOnJS — отложенный вызов вне эффекта, правило не применяется.
          runOnJS(setMounted)(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, translateY]);

  const requestClose = () => {
    if (dismissable) {
      hapticSelection();
      onClose();
    }
  };

  // Перетаскивание за «ручку»: вниз — закрыть, иначе вернуть на место.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6,
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) {
          translateY.value = g.dy;
        }
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > DISMISS_DRAG_DISTANCE || g.vy > DISMISS_DRAG_VELOCITY) {
          hapticSelection();
          onClose();
        } else {
          translateY.value = withSpring(0, springs.quick);
        }
      },
    })
  ).current;

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) {
    return null;
  }

  const sheetStatic: StyleProp<ViewStyle> = {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={requestClose}
      accessibilityViewIsModal
    >
      <View style={{ flex: 1, backgroundColor: colors.overlay }}>
        <Pressable
          accessibilityLabel="Закрыть"
          accessibilityRole="button"
          style={{ flex: 1 }}
          onPress={requestClose}
        />
        <Animated.View style={[sheetStatic, sheetStyle, style]} accessibilityLabel={title}>
          {/* Ручка для перетаскивания */}
          <View
            {...panResponder.panHandlers}
            hitSlop={{ top: 12, bottom: 12, left: 48, right: 48 }}
            style={{ alignItems: 'center', paddingBottom: spacing.sm }}
          >
            <View
              style={{
                width: 44,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.borderStrong,
              }}
            />
          </View>

          {title ? (
            <Text variant="h3" style={{ marginBottom: spacing.md }}>
              {title}
            </Text>
          ) : null}

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
