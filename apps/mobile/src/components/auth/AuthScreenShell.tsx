/**
 * AuthScreenShell — общая оболочка экранов входа.
 *
 * Safe area + скролл (клавиатура не перекрывает поля) + логотип
 * «Bazar» текстом (настоящий логотип — отдельный промт) + заголовок.
 */
import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from '@bazar/ui';

export interface AuthScreenShellProps {
  /** Заголовок экрана, например «Вход в Bazar». */
  title: string;
  /** Дополнительная строка под заголовком. */
  subtitle?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AuthScreenShell({
  title,
  subtitle,
  children,
  style,
}: AuthScreenShellProps) {
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: spacing.xl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: spacing.sm, marginTop: spacing.lg }}>
          <Text variant="display" color="primary">
            Bazar
          </Text>
        </View>
        <Text variant="h2">{title}</Text>
        {subtitle ? (
          <Text variant="body" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
        <View style={[{ gap: spacing.md }, style]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
