/**
 * SegmentedControl — сегментированный переключатель (Промт 15,
 * Часть E).
 *
 * Compact-высота 32: для шапки списков («По продавцам | По дате»).
 * Активный сегмент — поверхность с рамкой на приглушённом фоне
 * контейнера; подписи caption. Зона нажатия — весь сегмент
 * (высота контейнера 32 + hitSlop добирает до 48 по вертикали).
 * Только презентация, light/dark.
 */
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { hapticSelection } from '../../tokens';
import { Text } from '../Text';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
  testID,
}: SegmentedControlProps<T>) {
  const { colors, radii, spacing } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          height: 32,
          padding: 2,
          borderRadius: radii.pill,
          backgroundColor: colors.surfaceMuted,
          gap: 2,
        },
        style,
      ]}
      accessibilityRole="radiogroup"
      testID={testID}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            hitSlop={{ top: 8, bottom: 8 }}
            onPress={() => {
              if (!active) {
                hapticSelection();
                onChange(option.value);
              }
            }}
            testID={testID ? `${testID}-${option.value}` : undefined}
            style={{
              paddingHorizontal: spacing.sm + 2,
              borderRadius: radii.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.surface : 'transparent',
              borderWidth: active ? 1 : 0,
              borderColor: colors.border,
            }}
          >
            <Text
              variant="caption"
              color={active ? 'text' : 'textSecondary'}
              style={{
                fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
