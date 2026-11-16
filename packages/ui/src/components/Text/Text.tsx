/**
 * Text — базовый текстовый компонент дизайн-системы Bazar.
 *
 * Все тексты в приложении — только через этот компонент:
 * он гарантирует Inter, размеры кегля и контраст.
 */
import type { ReactNode } from 'react';
import {
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';
import { useTheme } from '../../theme';
import {
  NUMERIC_VARIANTS,
  TABULAR_NUMS,
  type ColorToken,
  type TextVariant,
} from '../../tokens';

export interface TextProps extends RNTextProps {
  /** Вариант типографики. По умолчанию body (17pt). */
  variant?: TextVariant;
  /** Цвет из палитры темы. По умолчанию основной текст. */
  color?: ColorToken;
  /** Табличные цифры: моноширинная ширина знаков для сумм и количеств. */
  mono?: boolean;
  /** Выравнивание текста. */
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
}

export function Text({
  variant = 'body',
  color = 'text',
  mono = false,
  align,
  style,
  children,
  ...rest
}: TextProps) {
  const { colors, typography } = useTheme();
  const token = typography[variant];
  // Числовые варианты — всегда табличные цифры (Промт 12, Часть B).
  const tabular = mono || NUMERIC_VARIANTS.includes(variant);

  const resolved: TextStyle = {
    fontFamily: token.fontFamily,
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    fontWeight: token.fontWeight as TextStyle['fontWeight'],
    letterSpacing: token.letterSpacing,
    color: colors[color],
    textAlign: align,
  };

  return (
    <RNText
      style={[
        resolved,
        tabular ? { fontVariant: [...TABULAR_NUMS] } : undefined,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
