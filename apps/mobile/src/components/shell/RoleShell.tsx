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
  /** Действие в шапке (Проброс в AppHeader, Промт 17, B). */
  headerRight?: ReactNode;
  children?: ReactNode;
}

export function RoleShell({
  title,
  tabItems,
  activeTabKey,
  onTabChange,
  headerRight,
  children,
}: RoleShellProps) {
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title={title} headerRight={headerRight} />

      {/* Контент от верха: центрирование коротких экранов давало
          «огромные пустоты сверху и снизу» (VLM-аудит доработки
          Промта 12) — рабочий инструмент начинается от шапки. */}
      <View style={{ flex: 1, justifyContent: 'flex-start' }}>{children}</View>

      <BottomTabBar
        items={tabItems}
        activeKey={activeTabKey}
        onChange={onTabChange}
      />
    </View>
  );
}
