/**
 * FilterChip — чип фильтра каталога.
 *
 * Два режима:
 * - кнопка-фильтр (onPress): активный — рамка primary и текст
 *   primaryText на primarySoft;
 * - тег активного фильтра (onRemove): приглушённаяsurfaceMuted-пилюля
 *   с крестиком — снимает фильтр одним нажатием.
 */
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { hapticSelection } from '../../tokens';
import { Text } from '../Text';

export interface FilterChipProps {
  label: string;
  icon?: LucideIcon | null;
  active?: boolean;
  /** Тег со крестиком: onPress убирает фильтр. */
  onRemove?: () => void;
  onPress?: () => void;
  /** sm (44) — фильтры рабочих списков; md (44) — каталог. */
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function FilterChip({
  label,
  icon: Icon = null,
  active = false,
  onRemove,
  onPress,
  size = 'md',
  style,
  testID,
}: FilterChipProps) {
  const { colors, radii, spacing } = useTheme();

  const removable = onRemove !== undefined;
  const background = removable
    ? colors.surfaceMuted
    : active
      ? colors.primarySoft
      : colors.surface;
  const borderColor = removable
    ? colors.border
    : active
      ? colors.primary
      : colors.border;
  const textColor = removable ? 'text' : active ? 'primaryText' : 'text';

  const content = (
    <View
      style={{
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: size === 'sm' ? 6 : spacing.xs + 2,
        paddingHorizontal: size === 'sm' ? spacing.md - 4 : spacing.md,
        borderRadius: radii.pill,
        backgroundColor: background,
        borderWidth: 1,
        borderColor,
      }}
    >
      {Icon ? (
        <Icon
          size={size === 'sm' ? 14 : 16}
          color={
            active && !removable ? colors.primaryText : colors.textSecondary
          }
        />
      ) : null}
      <Text variant={size === 'sm' ? 'caption' : 'bodySmall'} color={textColor}>
        {label}
      </Text>
      {removable ? <X size={16} color={colors.textSecondary} /> : null}
    </View>
  );

  const handler = removable ? onRemove : onPress;
  if (!handler) {
    return (
      <View style={style} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        removable ? `Убрать фильтр: ${label}` : `Фильтр: ${label}`
      }
      accessibilityState={{ selected: active }}
      testID={testID}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      onPress={() => {
        hapticSelection();
        handler();
      }}
      style={style}
    >
      {content}
    </Pressable>
  );
}
