/**
 * Checkbox — флажок (Промт 12, Часть C).
 *
 * Зона нажатия 48×48, видимый квадрат 24×24 (radius 4). Checked —
 * заливка primary и белый чекмарк; unchecked — рамка border на
 * surface. A11y: role="checkbox" + accessibilityState.
 */
import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { hapticSelection } from '../../tokens';
import { Text } from '../Text';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Вторая строка — пояснение к пункту. */
  hint?: string;
  disabled?: boolean;
  testID?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
  testID,
}: CheckboxProps) {
  const { colors, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => {
        hapticSelection();
        onChange(!checked);
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
          borderRadius: 4,
          borderWidth: checked ? 0 : 2,
          borderColor: colors.borderStrong,
          backgroundColor: checked ? colors.primary : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Check size={16} color={colors.onPrimary} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          variant="body"
          style={{ color: disabled ? colors.textDisabled : colors.text }}
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

/** Радиус квадратного флажка — для тестов и витрины. */
export const CHECKBOX_RADIUS = 4;
export const CHECKBOX_BOX = 24;
