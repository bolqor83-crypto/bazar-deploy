/**
 * Input — поле ввода Bazar.
 *
 * - Подпись сверху (bodySmall, textSecondary).
 * - Фон surface, радиус sm, minHeight 48.
 * - Фокус: граница primary 2px. Ошибка: граница danger + текст ошибки
 *   под полем (caption, danger). Подсказка показывается только без ошибки.
 * - rightIcon: иконка справа внутри поля (глаз видимости пароля и т.п.),
 *   зона нажатия ≥ 48×48, подпись доступности обязательна.
 */
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../Text';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  /** Текст ошибки: включает невалидное состояние. */
  error?: string | null;
  /** Подсказка под полем; скрыта при ошибке. */
  hint?: string | null;
  /** Иконка справа внутри поля (например, глаз видимости пароля). */
  rightIcon?: ReactNode;
  /** Подпись доступности правой иконки: обязательна при rightIcon. */
  rightIconAccessibilityLabel?: string;
  /** Нажатие на правую иконку. */
  onRightIconPress?: () => void;
  children?: ReactNode;
}

export function Input({
  label,
  error,
  hint,
  rightIcon,
  rightIconAccessibilityLabel,
  onRightIconPress,
  children,
  ...textInputProps
}: InputProps) {
  const { colors, radii, spacing } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderWidth = focused || error ? 2 : 1;
  const borderColor = error
    ? colors.danger
    : focused
      ? colors.primary
      : colors.border;

  const fieldStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth,
    borderColor,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  };

  const inputStyle: TextStyle = {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    lineHeight: 26,
    color: colors.text,
    paddingVertical: spacing.sm,
    flex: 1,
  };

  return (
    <View>
      {label ? (
        <Text
          variant="bodySmall"
          color="textSecondary"
          style={{ marginBottom: spacing.sm }}
        >
          {label}
        </Text>
      ) : null}

      <View style={fieldStyle}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint ?? undefined}
          accessibilityState={{ disabled: textInputProps.editable === false }}
          {...textInputProps}
          style={inputStyle}
          onFocus={(e) => {
            setFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            textInputProps.onBlur?.(e);
          }}
        />
        {rightIcon ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightIconAccessibilityLabel}
            onPress={onRightIconPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              minHeight: 48,
              justifyContent: 'center',
              paddingLeft: spacing.sm,
            }}
          >
            {rightIcon}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text
          variant="caption"
          color="danger"
          style={{ marginTop: spacing.sm }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          variant="caption"
          color="textMuted"
          style={{ marginTop: spacing.sm }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
