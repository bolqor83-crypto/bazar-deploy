/**
 * QuantitySelector — выбор количества.
 *
 * Кнопки «−» и «+» строго 48×48 (операционный контекст: перчатки,
 * слабый свет). Значение — табличные цифры. Ограничения min/max:
 * на границах соответствующая кнопка выключается.
 */
import { Pressable, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { hapticSelection } from '../../tokens';
import { Text } from '../Text';

export interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  /** Минимум, по умолчанию 0. */
  min?: number;
  /** Максимум, по умолчанию 99. */
  max?: number;
  disabled?: boolean;
}

export function QuantitySelector({
  value,
  onChange,
  min = 0,
  max = 99,
  disabled = false,
}: QuantitySelectorProps) {
  const { colors, radii, spacing } = useTheme();

  const canDecrement = !disabled && value > min;
  const canIncrement = !disabled && value < max;

  const step = (delta: number, enabled: boolean, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => {
        if (!enabled) {
          return;
        }
        hapticSelection();
        onChange(value + delta);
      }}
      style={({ pressed }) => [
        {
          width: 48,
          height: 48,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: enabled ? colors.borderStrong : colors.border,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed && enabled ? { opacity: 0.7 } : null,
      ]}
    >
      {delta < 0 ? (
        <Minus size={22} color={enabled ? colors.text : colors.textDisabled} />
      ) : (
        <Plus size={22} color={enabled ? colors.text : colors.textDisabled} />
      )}
    </Pressable>
  );

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      accessibilityLabel={`Количество: ${value}`}
    >
      {step(-1, canDecrement, 'Уменьшить количество')}
      <Text variant="body" mono style={{ minWidth: 40, textAlign: 'center' }}>
        {value}
      </Text>
      {step(1, canIncrement, 'Увеличить количество')}
    </View>
  );
}
