/**
 * Select — выбор из списка (Промт 12, Часть C).
 *
 * Триггер height 48 (border, radius sm) открывает нижний шит Dialog
 * с radio-списком: выбранная опция — чекмарк и primary-текст. Шита
 * скроллится, зона строки ≥ 48. Пустой список — осмысленная подпись.
 * A11y: accessibilityRole="combobox" + accessibilityState.
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { hapticSelection } from '../../tokens';
import { Dialog } from '../Dialog';
import { Text } from '../Text';

export interface SelectOption {
  value: string;
  label: string;
  /** Вторая строка опции (адрес, пояснение). */
  hint?: string;
}

export interface SelectProps {
  value: string | null;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  testID?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Выберите…',
  label,
  error,
  disabled = false,
  testID,
}: SelectProps) {
  const { colors, radii, spacing } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value) ?? null;
  const triggerText = selected ? selected.label : placeholder;
  const borderColor = error ? colors.danger : colors.border;

  return (
    <View testID={testID}>
      {label ? (
        <Text
          variant="bodySmall"
          color="textSecondary"
          style={{ marginBottom: spacing.sm }}
        >
          {label}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={label ? `${label}: ${triggerText}` : triggerText}
        accessibilityHint="Открывает список вариантов"
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => {
          hapticSelection();
          setOpen(true);
        }}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            height: 48,
            paddingHorizontal: spacing.md,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor,
            backgroundColor: colors.surface,
            opacity: disabled ? 0.5 : 1,
          },
          pressed && !disabled ? { opacity: 0.7 } : null,
        ]}
      >
        <Text
          variant="body"
          color={selected ? 'text' : 'textMuted'}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {triggerText}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      {error ? (
        <Text
          variant="caption"
          color="danger"
          style={{ marginTop: spacing.sm }}
        >
          {error}
        </Text>
      ) : null}

      <Dialog
        visible={open}
        onClose={() => setOpen(false)}
        title={label ?? 'Выбор'}
      >
        {options.length === 0 ? (
          <Text variant="body" color="textSecondary">
            Список пуст — попросите пополнить справочник.
          </Text>
        ) : (
          <ScrollView style={{ maxHeight: 380 }}>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    hapticSelection();
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      minHeight: 48,
                      paddingVertical: spacing.sm,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="body"
                      color={isSelected ? 'primaryText' : 'text'}
                    >
                      {option.label}
                    </Text>
                    {option.hint ? (
                      <Text variant="caption" color="textMuted">
                        {option.hint}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected ? (
                    <Check size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </Dialog>
    </View>
  );
}
