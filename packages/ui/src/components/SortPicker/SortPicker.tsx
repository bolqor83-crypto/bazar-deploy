/**
 * SortPicker — выбор сортировки каталога.
 *
 * Кнопка-чип с иконкой ⇅ и текущим способом; по нажатию — меню
 * (рамка, поверхность) с четырьмя вариантами, у активного — галочка.
 * Выбор закрывает меню. Тот же список значений, что в API
 * (popular | price-asc | price-desc | name).
 */
import { useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { hapticSelection } from '../../tokens';
import { Text } from '../Text';

export const SORT_OPTIONS = [
  { value: 'popular', label: 'По популярности' },
  { value: 'price-asc', label: 'Сначала дешевле' },
  { value: 'price-desc', label: 'Сначала дороже' },
  { value: 'name', label: 'По алфавиту' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export interface SortPickerProps {
  value: SortValue;
  onChange: (value: SortValue) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SortPicker({
  value,
  onChange,
  style,
  testID,
}: SortPickerProps) {
  const { colors, radii, spacing } = useTheme();
  const [open, setOpen] = useState(false);

  const current =
    SORT_OPTIONS.find((option) => option.value === value) ?? SORT_OPTIONS[0];

  return (
    <View style={style} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Сортировка: ${current.label}`}
        accessibilityState={{ expanded: open }}
        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
        onPress={() => {
          hapticSelection();
          setOpen(!open);
        }}
      >
        <View
          style={{
            height: 40,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs + 2,
            paddingHorizontal: spacing.md,
            borderRadius: radii.pill,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <ArrowUpDown size={16} color={colors.textSecondary} />
          <Text variant="bodySmall">{current.label}</Text>
          <ChevronDown
            size={16}
            color={colors.textSecondary}
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          />
        </View>
      </Pressable>

      {open ? (
        <View
          style={{
            position: 'absolute',
            top: 46,
            left: 0,
            right: 0,
            zIndex: 10,
            backgroundColor: colors.surface,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: spacing.xs,
            elevation: 2,
          }}
        >
          {SORT_OPTIONS.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="menuitem"
                accessibilityLabel={`Сортировать ${option.label}`}
                accessibilityState={{ selected }}
                onPress={() => {
                  hapticSelection();
                  onChange(option.value);
                  setOpen(false);
                }}
                style={{
                  minHeight: 48,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: spacing.md,
                }}
              >
                <Text
                  variant="bodySmall"
                  color={selected ? 'primaryText' : 'text'}
                >
                  {option.label}
                </Text>
                {selected ? (
                  <Check size={18} color={colors.primaryText} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
