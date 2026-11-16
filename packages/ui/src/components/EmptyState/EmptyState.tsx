/**
 * EmptyState — пустое состояние раздела.
 *
 * Два режима (Промт 12, Часть A): обычный — иконка 64, вертикальное
 * центрирование; compact — иконка 40 и прижатие к верху (рабочие
 * списки: пользователь видит шапку и фильтры, а не «пустоту в
 * центре экрана»). Тексты — смысловые (body), не «Нет данных».
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
  /** Компактный режим: иконка 40, без вертикального центрирования. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  testID?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
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
          justifyContent: compact ? 'flex-start' : 'center',
          paddingVertical: compact ? spacing.lg : spacing.xxl,
          paddingHorizontal: spacing.lg,
          gap: compact ? spacing.sm : spacing.md,
        },
        style,
      ]}
    >
      {Icon ? <Icon size={compact ? 40 : 64} color={colors.textMuted} /> : null}

      <Text variant="h3" align="center">
        {title}
      </Text>

      {description ? (
        <Text variant="body" color="textSecondary" align="center">
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
