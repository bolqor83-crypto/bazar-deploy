/**
 * Radio — радиокнопка (Промт 12, Часть C).
 *
 * Зона нажатия 48×48, видимый круг 24×24. Selected — рамка primary
 * 2px и точка primary внутри; обычный — рамка borderStrong. A11y:
 * role="radio" + accessibilityState.
 */
import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme';
import { hapticSelection } from '../../tokens';
import { Text } from '../Text';

export interface RadioProps {
  selected: boolean;
  onPress: () => void;
  label: string;
  /** Вторая строка — пояснение к варианту. */
  hint?: string;
  disabled?: boolean;
  testID?: string;
}

export function Radio({
  selected,
  onPress,
  label,
  hint,
  disabled = false,
  testID,
}: RadioProps) {
  const { colors, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      hitSlop={4}
      testID={testID}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: 48,
          paddingVertical: spacing.xs + 2,
          opacity: disabled ? 0.5 : 1,
        },
        pressed && !disabled ? { opacity: 0.7 } : null,
      ]}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: selected ? colors.primary : colors.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? (
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: colors.primary,
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          variant="body"
          style={{
            color: selected
              ? colors.primaryText
              : disabled
                ? colors.textDisabled
                : colors.text,
          }}
        >
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
