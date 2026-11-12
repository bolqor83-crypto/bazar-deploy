/**
 * PriceRangeInput — диапазон цены «от — до».
 *
 * Два числовых поля в рублях (человек вводит рубли, API фильтрует по
 * ним). Высота 48, рамки, подписи «от»/«до» внутри полей. Значения
 * живут в состоянии родителя: контролируемый ввод.
 */
import { View, TextInput, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../Text';

export interface PriceRangeInputProps {
  /** Минимальная цена, рубли (пустая строка — не задана). */
  min: string;
  max: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  /** Подпись единицы после полей, по умолчанию ₽. */
  unit?: string;
  style?: StyleProp<ViewStyle>;
}

/** Только цифры: копеечная точность не нужна на поле фильтра. */
function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

export function PriceRangeInput({
  min,
  max,
  onMinChange,
  onMaxChange,
  unit = '₽',
  style,
}: PriceRangeInputProps) {
  const { colors, radii, spacing } = useTheme();

  const fieldStyle = {
    flex: 1,
    height: 48,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 17,
    fontFamily: 'Inter_400Regular' as const,
    paddingVertical: 0,
  };

  return (
    <View style={style}>
      <Text
        variant="bodySmall"
        color="textSecondary"
        style={{ marginBottom: spacing.sm }}
      >
        Цена, {unit}
      </Text>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <View style={{ flex: 1, position: 'relative' }}>
          <TextInput
            accessibilityLabel="Цена от"
            value={min}
            onChangeText={(v) => onMinChange(digitsOnly(v))}
            placeholder="от"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            inputMode="numeric"
            style={fieldStyle}
          />
        </View>
        <View
          style={{
            width: 12,
            height: 1,
            backgroundColor: colors.borderStrong,
          }}
        />
        <View style={{ flex: 1 }}>
          <TextInput
            accessibilityLabel="Цена до"
            value={max}
            onChangeText={(v) => onMaxChange(digitsOnly(v))}
            placeholder="до"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            inputMode="numeric"
            style={fieldStyle}
          />
        </View>
      </View>
    </View>
  );
}
