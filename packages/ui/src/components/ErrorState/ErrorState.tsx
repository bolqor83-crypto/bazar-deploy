/**
 * ErrorState — состояние ошибки.
 *
 * Заголовок и описание по умолчанию честные и спокойные,
 * кнопка «Повторить» — secondary. Иконка AlertCircle в терракоте
 * (danger): красный запрещён.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { Button } from '../Button';
import { Text } from '../Text';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({
  title = 'Что-то пошло не так',
  description = 'Проверьте соединение и попробуйте снова',
  onRetry,
  retryLabel = 'Повторить',
  style,
}: ErrorStateProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
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
      <AlertCircle size={64} color={colors.danger} />

      <Text variant="h3" align="center">
        {title}
      </Text>

      <Text variant="bodySmall" color="textSecondary" align="center">
        {description}
      </Text>

      {onRetry ? (
        <Button variant="secondary" size="md" onPress={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </View>
  );
}
