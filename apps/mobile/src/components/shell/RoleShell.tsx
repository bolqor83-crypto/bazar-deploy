/**
 * RoleShell — обёртка экрана роли.
 *
 * Шапка (заголовок + контекст + тема + профиль), контент и
 * кастомный таб-бар. Пункт «Инструменты» — переход на полноэкранный
 * экран «Все инструменты» (Промт 12, Часть D), не шит.
 */
import { type ReactNode } from 'react';
import { View } from 'react-native';
import { AppHeader } from './AppHeader';
import { BottomTabBar } from './BottomTabBar';
import type { TabItem } from './navigation';

export interface RoleShellProps {
  title: string;
  tabItems: TabItem[];
  activeTabKey: string | null;
  onTabChange: (key: string) => void;
  children?: ReactNode;
}

export function RoleShell({
  title,
  tabItems,
  activeTabKey,
  onTabChange,
  children,
}: RoleShellProps) {
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={title} />

      <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>

      <BottomTabBar
        items={tabItems}
        activeKey={activeTabKey}
        onChange={onTabChange}
      />
    </View>
  );
}
