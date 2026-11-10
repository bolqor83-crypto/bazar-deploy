/**
 * RoleShell — обёртка экрана роли.
 *
 * Шапка (заголовок + контекст + тема + профиль), контент и
 * кастомный таб-бар. Пункт «Ещё» открывает шит с остальными
 * разделами роли.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Dialog, Text, hapticSelection, useTheme } from '@bazar/ui';
import { AppHeader } from './AppHeader';
import { BottomTabBar } from './BottomTabBar';
import { MORE_KEY, type MoreItem, type TabItem } from './navigation';

export interface RoleShellProps {
  title: string;
  tabItems: TabItem[];
  activeTabKey: string | null;
  onTabChange: (key: string) => void;
  /** Разделы кнопки «Ещё». */
  moreItems?: MoreItem[];
  children?: ReactNode;
}

export function RoleShell({
  title,
  tabItems,
  activeTabKey,
  onTabChange,
  moreItems,
  children,
}: RoleShellProps) {
  const { colors, spacing } = useTheme();
  const [moreVisible, setMoreVisible] = useState(false);
  const hasMore = (moreItems?.length ?? 0) > 0;

  const handleTabChange = (key: string) => {
    if (key === MORE_KEY) {
      if (hasMore) {
        hapticSelection();
        setMoreVisible(true);
      }
      return;
    }
    onTabChange(key);
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={title} />

      <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>

      <BottomTabBar items={tabItems} activeKey={activeTabKey} onChange={handleTabChange} />

      <Dialog visible={moreVisible} onClose={() => setMoreVisible(false)} title="Ещё">
        <View style={{ paddingBottom: spacing.sm }}>
          {(moreItems ?? []).map((item) => {
            const Icon = item.icon;
            const rowStyle: StyleProp<ViewStyle> = {
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              minHeight: 48,
              paddingVertical: spacing.sm,
            };
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => {
                  hapticSelection();
                  setMoreVisible(false);
                  onTabChange(item.key);
                }}
                style={({ pressed }) => [rowStyle, pressed ? { opacity: 0.7 } : null]}
              >
                <Icon size={22} color={colors.textSecondary} />
                <Text variant="body" style={{ flex: 1 }}>
                  {item.label}
                </Text>
                <ChevronRight size={20} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      </Dialog>
    </View>
  );
}
