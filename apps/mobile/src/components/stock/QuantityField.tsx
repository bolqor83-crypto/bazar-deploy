/**
 * QuantityField — поле количества для складских форм (Промт 11b).
 *
 * Единый контрол: [−] [ 50 кг ] [+] с общей границей — кнопки
 * приклеены к полю (attached stepper), читается как одна группа.
 * Значение — TextInput по центру (tabular-nums, крупно). Лимит
 * максимума — блокировкой плюса; подсказки и ошибки — снаружи.
 * Плейсхолдер «0» — приглушённым цветом: полужирный ноль в цвете
 * поля читался как введённое значение (VLM-аудит).
 */
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Text, useTheme } from '@bazar/ui';

export interface QuantityFieldProps {
  /** Текстовое значение (контролируемый ввод). */
  value: string;
  onChangeText: (value: string) => void;
  /** Единица для подписи внутри поля: «кг», «шт». */
  unit?: string;
  /** Максимум шага «+» (доступный остаток); null — без лимита. */
  max?: number | null;
  testID?: string;
}

export function QuantityField({
  value,
  onChangeText,
  unit,
  max = null,
  testID,
}: QuantityFieldProps) {
  const { colors, radii } = useTheme();
  const [focused, setFocused] = useState(false);

  const numeric = Number.parseInt(value, 10);
  const current = Number.isFinite(numeric) ? numeric : 0;
  const canIncrement = max === null || current < max;
  const canDecrement = current > 0;
  const radius = radii.sm;

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
        onChangeText(String(Math.max(0, current + delta)));
      }}
      style={({ pressed }) => [
        {
          width: 48,
          height: 48,
          borderTopLeftRadius: delta < 0 ? radius : 0,
          borderBottomLeftRadius: delta < 0 ? radius : 0,
          borderTopRightRadius: delta > 0 ? radius : 0,
          borderBottomRightRadius: delta > 0 ? radius : 0,
          borderWidth: 1,
          borderColor: focused ? colors.primary : colors.border,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: delta > 0 ? -1 : 0,
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
      style={{ flexDirection: 'row', alignItems: 'stretch' }}
      accessibilityLabel={`Количество${unit ? `, ${unit}` : ''}: ${value}`}
    >
      {step(-1, canDecrement, 'Уменьшить количество')}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          minHeight: 48,
          paddingHorizontal: 12,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: focused ? colors.primary : colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textDisabled}
          accessibilityLabel="Количество"
          style={{
            flex: 1,
            fontFamily: 'Inter_700Bold',
            // Крупно: количество — главное число складской формы
            // (VLM-аудит итерации 4: «5 мелкая относительно важности»).
            fontSize: 24,
            lineHeight: 32,
            color: colors.text,
            paddingVertical: 8,
            fontVariant: ['tabular-nums'],
            textAlign: 'center',
          }}
          testID={testID}
        />
        {unit ? (
          <Text variant="caption" color="textSecondary">
            {unit}
          </Text>
        ) : null}
      </View>
      {step(1, canIncrement, 'Увеличить количество')}
    </View>
  );
}
