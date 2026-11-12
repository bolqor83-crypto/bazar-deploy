/**
 * EmptyState — пустое состояние раздела.
 *
 * Иконка 64×64 (textMuted), заголовок h3, описание и опциональное
 * действие. Тексты — смысловые, не «Нет данных».
 */
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Button } from '../Button';
import { Text } from '../Text';

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

export interface EmptyStateProps {
  /** Иконка раздела. */
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  testID?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  style,
  children,
  testID,
}: EmptyStateProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xxl,
          gap: spacing.md,
        },
        style,
      ]}
    >
      {Icon ? <Icon size={64} color={colors.textMuted} /> : null}

      <Text variant="h3" align="center">
        {title}
      </Text>

      {description ? (
        <Text variant="bodySmall" color="textSecondary" align="center">
          {description}
        </Text>
      ) : null}

      {action ? (
        <Button variant="primary" size="md" onPress={action.onPress}>
          {action.label}
        </Button>
      ) : null}

      {children}
    </View>
  );
}
