/**
 * AuthScreenShell — общая оболочка экранов входа.
 *
 * Safe area + скролл (клавиатура не перекрывает поля) + логотип
 * «Bazar» текстом (настоящий логотип — отдельный промт) + иконка-
 * якорь 56×56 на пастельной плашке (визуальный аудит Промта 8:
 * экрану нужен якорь для слабого света и перчаток) + заголовок.
 */
import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { Text, useTheme } from '@bazar/ui';

export interface AuthScreenShellProps {
  /** Заголовок экрана, например «Вход в Bazar». */
  title: string;
  /** Дополнительная строка под заголовком. */
  subtitle?: string;
  /** Иконка-якорь на плашке между логотипом и заголовком. */
  icon?: LucideIcon;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AuthScreenShell({
  title,
  subtitle,
  icon: Icon,
  children,
  style,
}: AuthScreenShellProps) {
  const { colors, radii, spacing } = useTheme();

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
        {Icon ? (
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radii.md,
              backgroundColor: colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityElementsHidden
          >
            <Icon size={28} color={colors.primaryText} />
          </View>
        ) : null}
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
