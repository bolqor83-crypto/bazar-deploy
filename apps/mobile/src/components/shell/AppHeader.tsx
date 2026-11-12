/**
 * AppHeader — шапка приложения.
 *
 * Слева: переключатель контекста. Центр: заголовок экрана.
 * Справа: переключатель темы и профиль. Высота 56 + safe area сверху.
 * Все зоны нажатия ≥ 48×48.
 */
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useTheme } from '@bazar/ui';
import { useContextSheetStore } from '../../stores/contextSheetStore';
import { ContextSheet } from './ContextSheet';
import { ContextSwitcher } from './ContextSwitcher';
import { ProfileButton } from './ProfileButton';
import { ThemeToggle } from './ThemeToggle';

const HEADER_HEIGHT = 56;

export interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const sheetVisible = useContextSheetStore((s) => s.visible);
  const closeSheet = useContextSheetStore((s) => s.close);
  const openSheet = useContextSheetStore((s) => s.open);

  const containerStyle: StyleProp<ViewStyle> = {
    paddingTop: insets.top,
    height: insets.top + HEADER_HEIGHT,
    backgroundColor: isDark ? colors.backgroundElevated : colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  };

  return (
    <View style={containerStyle}>
      <ContextSwitcher onPress={openSheet} />

      <View style={{ flex: 1, alignItems: 'center' }} pointerEvents="none">
        <Text variant="h3" numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ThemeToggle />
        <ProfileButton />
      </View>

      <ContextSheet visible={sheetVisible} onClose={closeSheet} />
    </View>
  );
}
