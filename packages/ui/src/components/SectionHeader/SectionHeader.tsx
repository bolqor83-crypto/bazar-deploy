/**
 * SectionHeader — заголовок раздела с действием справа.
 *
 * Заголовок h3 слева, текстовая кнопка-действие (primaryText) справа.
 * Действие — цель 48 по высоте строки: заголовок крупный, hitSlop
 * добирает зону.
 */
import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { hapticTap } from '../../tokens';
import { Text } from '../Text';

export interface SectionHeaderProps {
  title: string;
  /** Текст действия справа; без него — просто заголовок. */
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  children,
  style,
  testID,
}: SectionHeaderProps) {
  const { spacing } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 48,
          gap: spacing.md,
        },
        style,
      ]}
      testID={testID}
    >
      <Text variant="h3">{title}</Text>
      {children}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          onPress={() => {
            hapticTap();
            onAction();
          }}
        >
          <Text variant="bodySmall" color="primaryText">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
