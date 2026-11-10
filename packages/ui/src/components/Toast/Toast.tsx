/**
 * Toast — всплывающее уведомление сверху экрана.
 *
 * - Очередь: показывается по одному, длительность 3000 мс по умолчанию.
 * - Не блокирует UI: контейнер box-none, карточка тапается (закрытие).
 * - Варианты: success / error / info. Красный не используется.
 * - Размещение с учётом safe area сверху.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AlertCircle, CheckCircle2, Info, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { durations, hapticError, hapticSuccess, springs } from '../../tokens';
import { Text } from '../Text';
import { useToastStore, type ToastVariant } from './toastStore';

const ICONS: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export interface ToastProviderProps {
  children: ReactNode;
}

/** Одна карточка уведомления. */
function ToastCard({ onDismiss }: { onDismiss: () => void }) {
  const { colors, radii, spacing, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);

  useEffect(() => {
    translateY.value = withSpring(0, springs.quick);
    return () => {
      translateY.value = withTiming(-120, { duration: durations.fast });
    };
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const cardStyle: StyleProp<ViewStyle> = {
    marginTop: insets.top + spacing.sm,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
      <Animated.View style={animatedStyle} pointerEvents="auto">
        <Animated.View
          style={[
            cardStyle,
            !isDark
              ? {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 6,
                }
              : null,
          ]}
        >
          <ToastContent onDismiss={onDismiss} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function ToastContent({ onDismiss }: { onDismiss: () => void }) {
  const toast = useToastStore((s) => s.queue[0]);
  const { colors, spacing } = useTheme();

  if (!toast) {
    return null;
  }

  const Icon = ICONS[toast.variant];
  const iconColor =
    toast.variant === 'success'
      ? colors.success
      : toast.variant === 'error'
        ? colors.danger
        : colors.info;

  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityLabel={`Уведомление: ${toast.message}`}
      onPress={onDismiss}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}
    >
      <Icon size={22} color={iconColor} />
      <Text variant="bodySmall" style={{ flex: 1 }}>
        {toast.message}
      </Text>
    </Pressable>
  );
}

export function ToastProvider({ children }: ToastProviderProps) {
  const queue = useToastStore((s) => s.queue);
  const dismissCurrent = useToastStore((s) => s.dismissCurrent);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = queue[0];

  // Автоскрытие по таймеру длительности.
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (toast) {
      if (toast.variant === 'success') hapticSuccess();
      if (toast.variant === 'error') hapticError();
      timerRef.current = setTimeout(() => {
        dismissCurrent();
      }, toast.duration);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast, dismissCurrent]);

  return (
    <View style={{ flex: 1 }} pointerEvents="box-none">
      {children}
      {toast ? <ToastCard onDismiss={dismissCurrent} /> : null}
    </View>
  );
}
