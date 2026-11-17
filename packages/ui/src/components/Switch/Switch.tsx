/**
 * Switch — переключатель (Промт 12, Часть C).
 *
 * Трек 48×28, бегунок 24 (шаг 20). Off — заливка surfaceMuted
 * (VLM-аудит: пустой трек с одной рамкой читался как «не
 * переключатель»); on — заливка primary. Бегунок двигается таймингом
 * 150 мс (быстрый отклик, дозированная анимация). Haptic selection
 * на переключение. A11y: role="switch" + accessibilityState.
 */
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { durations, hapticSelection } from '../../tokens';
import { Text } from '../Text';

export interface SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  /** Подпись слева от переключателя. */
  label?: string;
  /** Вторая строка — пояснение. */
  hint?: string;
  disabled?: boolean;
  testID?: string;
}

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 24;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - 4; // 20

export function Switch({
  value,
  onChange,
  label,
  hint,
  disabled = false,
  testID,
}: SwitchProps) {
  const { colors, spacing } = useTheme();
  const left = useSharedValue(value ? THUMB_TRAVEL : 0);

  useEffect(() => {
    left.value = withTiming(value ? THUMB_TRAVEL : 0, {
      duration: durations.fast,
    });
  }, [value, left]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: left.value }],
  }));

  const track = (
    <Animated.View
      style={{
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        borderRadius: 14,
        // Off — заливка border: трек читается как орган управления
        // в обеих темах (surfaceMuted на карточке был почти невидим,
        // VLM-аудит итерации 4).
        backgroundColor: value ? colors.primary : colors.border,
        padding: 2,
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: 12,
            backgroundColor: disabled ? colors.textDisabled : colors.onPrimary,
          },
          thumbStyle,
        ]}
      />
    </Animated.View>
  );

  if (!label) {
    return (
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        disabled={disabled}
        onPress={() => {
          hapticSelection();
          onChange(!value);
        }}
        hitSlop={8}
        testID={testID}
        style={({ pressed }) => [
          {
            minHeight: 48,
            minWidth: 48,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pressed ? { opacity: 0.8 } : null,
        ]}
      >
        {track}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => {
        hapticSelection();
        onChange(!value);
      }}
      testID={testID}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: 48,
          paddingVertical: spacing.xs + 2,
          opacity: disabled ? 0.5 : 1,
        },
        pressed && !disabled ? { opacity: 0.8 } : null,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text
          variant="body"
          style={{ color: disabled ? colors.textDisabled : colors.text }}
        >
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
        ) : null}
      </View>
      {track}
    </Pressable>
  );
}
