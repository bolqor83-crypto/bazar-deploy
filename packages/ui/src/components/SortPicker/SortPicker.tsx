/**
 * SortPicker — выбор сортировки каталога.
 *
 * Кнопка-чип с иконкой ⇅ и текущим способом; по нажатию — меню
 * (рамка, поверхность) с четырьмя вариантами, у активного — галочка.
 * Выбор закрывает меню. Тот же список значений, что в API
 * (popular | price-asc | price-desc | name).
 *
 * Промт 15 (Часть D): compact — для заголовка секции «Все товары»:
 * высота 32, иконка + значение в одну строку, без шеврона.
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

/** Короткие подписи для compact-режима (Промт 15): заголовок
 *  секции «Все товары» — одна строка, длинные подписи не влезают. */
const COMPACT_SORT_LABELS: Record<SortValue, string> = {
  popular: 'Популярное',
  'price-asc': 'Дешевле',
  'price-desc': 'Дороже',
  name: 'По алфавиту',
};

function compactSortLabel(value: SortValue): string {
  return COMPACT_SORT_LABELS[value];
}

export interface SortPickerProps {
  value: SortValue;
  onChange: (value: SortValue) => void;
  /** Компактный режим (Промт 15): высота 32, без шеврона —
   *  для заголовка секции каталога. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SortPicker({
  value,
  onChange,
  compact = false,
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
          style={[
            {
              minHeight: compact ? 32 : 40,
              flexDirection: 'row',
              alignItems: 'center',
              gap: compact ? spacing.xs : spacing.xs + 2,
              paddingHorizontal: compact ? 10 : spacing.md,
              borderRadius: radii.pill,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            },
            compact ? { paddingVertical: 4 } : { height: 40 },
          ]}
        >
          <ArrowUpDown size={compact ? 14 : 16} color={colors.textSecondary} />
          <Text variant={compact ? 'caption' : 'bodySmall'} numberOfLines={1}>
            {compact ? compactSortLabel(current.value) : current.label}
          </Text>
          {compact ? null : (
            <ChevronDown
              size={16}
              color={colors.textSecondary}
              style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
            />
          )}
        </View>
      </Pressable>

      {open ? (
        <View
          style={{
            position: 'absolute',
            top: compact ? 38 : 46,
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
