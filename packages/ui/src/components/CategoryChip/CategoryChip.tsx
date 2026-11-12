/**
 * CategoryChip — чип категории каталога.
 *
 * Активная категория — заливка primary (белый текст), неактивная —
 * поверхность с рамкой. Высота 40, hitSlop добирает до 48 (перчатки).
 * Иконка категории — Lucide, один размер 16.
 */
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { hapticSelection } from '../../tokens';
import { Text } from '../Text';

export interface CategoryChipProps {
  label: string;
  icon?: LucideIcon | null;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function CategoryChip({
  label,
  icon: Icon = null,
  active = false,
  onPress,
  style,
  testID,
}: CategoryChipProps) {
  const { colors, radii, spacing } = useTheme();

  const content = (
    <View
      style={{
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
        paddingHorizontal: spacing.md,
        borderRadius: radii.pill,
        backgroundColor: active ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      {Icon ? (
        <Icon
          size={16}
          color={active ? colors.onPrimary : colors.textSecondary}
        />
      ) : null}
      <Text
        variant="bodySmall"
        color={active ? 'onPrimary' : 'text'}
        style={{
          fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
        }}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) {
    return (
      <View style={style} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Категория: ${label}`}
      accessibilityState={{ selected: active }}
      testID={testID}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={style}
    >
      {content}
    </Pressable>
  );
}
