/**
 * LocationSelector — выбор торговой точки.
 *
 * Кнопка-триггер (≥48) с иконкой и названием выбранной точки
 * («Вся сеть», когда точка не выбрана) открывает нижний шит (Dialog)
 * со списком точек организации и опцией «Вся сеть».
 */
import { useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, ChevronDown, MapPin } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { hapticSelection } from '../../tokens';
import { Dialog } from '../Dialog';
import { Text } from '../Text';

/** Точка выбора (структура BusinessLocation без лишних полей). */
export interface SelectorLocation {
  id: string;
  name: string;
  address?: string;
}

export interface LocationSelectorProps {
  locations: SelectorLocation[];
  /** Идентификатор выбранной точки; null — «Вся сеть». */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Подпись шита; по умолчанию «Торговая точка». */
  label?: string;
  disabled?: boolean;
}

export function LocationSelector({
  locations,
  value,
  onChange,
  label = 'Торговая точка',
  disabled = false,
}: LocationSelectorProps) {
  const { colors, radii, spacing } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = locations.find((loc) => loc.id === value) ?? null;
  const triggerLabel = selected ? selected.name : 'Вся сеть';

  const pick = (id: string | null) => {
    hapticSelection();
    onChange(id);
    setOpen(false);
  };

  const rowStyle: StyleProp<ViewStyle> = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingVertical: spacing.sm,
  };

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${triggerLabel}. Изменить`}
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
            minHeight: 48,
            paddingHorizontal: spacing.md,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            opacity: disabled ? 0.5 : 1,
          },
          pressed && !disabled ? { opacity: 0.7 } : null,
        ]}
      >
        <MapPin size={20} color={colors.primary} />
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={{ flex: 1, opacity: disabled ? 0.6 : 1 }}
        >
          {triggerLabel}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      <Dialog visible={open} onClose={() => setOpen(false)} title={label}>
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Вся сеть"
            accessibilityState={{ selected: value === null }}
            onPress={() => pick(null)}
            style={rowStyle}
          >
            <View style={{ flex: 1 }}>
              <Text
                variant="body"
                color={value === null ? 'primaryText' : 'text'}
              >
                Вся сеть
              </Text>
              <Text variant="caption" color="textMuted">
                Все точки организации
              </Text>
            </View>
            {value === null ? <Check size={20} color={colors.primary} /> : null}
          </Pressable>

          {locations.map((loc) => {
            const isSelected = loc.id === value;
            return (
              <Pressable
                key={loc.id}
                accessibilityRole="button"
                accessibilityLabel={loc.name}
                accessibilityState={{ selected: isSelected }}
                onPress={() => pick(loc.id)}
                style={rowStyle}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    variant="body"
                    color={isSelected ? 'primaryText' : 'text'}
                  >
                    {loc.name}
                  </Text>
                  {loc.address ? (
                    <Text variant="caption" color="textMuted">
                      {loc.address}
                    </Text>
                  ) : null}
                </View>
                {isSelected ? <Check size={20} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Dialog>
    </View>
  );
}
