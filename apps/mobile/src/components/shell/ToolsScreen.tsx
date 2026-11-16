/**
 * ToolsScreen — «Все инструменты» роли (Промт 12, Часть D).
 *
 * Полноэкранный экран вместо шита «Ещё»: поиск по названию раздела,
 * группы (Торговля / Склад / Клиенты / Финансы / Аккаунт), компактные
 * строки 56 (иконка 20 + название + chevron + бейдж ожидающих
 * действий). Поиск фильтрует по подстроке, показываются только
 * группы с найденными разделами. Кнопка «Назад» — только если есть
 * куда возвращаться (прямой заход не через таб-бар).
 */
import { useMemo, useState } from 'react';
import { Pressable, SectionList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react-native';
import {
  Badge,
  Divider,
  EmptyState,
  SearchBar,
  Text,
  useTheme,
} from '@bazar/ui';
import type { Role } from '@bazar/types';
import type { LucideIcon } from 'lucide-react-native';
import { RoleScreen } from './RoleScreen';
import { moreGroupsFor, type MoreGroup } from './navigation';
import { useUnreadNotificationsCount } from '../../hooks/useNotifications';

export function ToolsScreen({ role }: { role: Role }) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const [search, setSearch] = useState('');

  // Бейджи ожидающих действий: непрочитанные уведомления.
  const unreadQuery = useUnreadNotificationsCount();
  const unread = typeof unreadQuery.data === 'number' ? unreadQuery.data : 0;

  const groups = useMemo(() => moreGroupsFor(role), [role]);

  const visibleGroups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return groups;
    }
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, search]);

  const sections = visibleGroups.map((group) => ({
    key: group.title,
    title: group.title,
    data: group.items,
  }));

  const canGoBack =
    typeof router.canGoBack === 'function' && router.canGoBack();

  return (
    <RoleScreen role={role} section="more" title="Все инструменты">
      <View style={{ flex: 1, width: '100%' }}>
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: spacing.xs,
            gap: spacing.sm,
          }}
        >
          {canGoBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Назад"
              onPress={() => router.back()}
              hitSlop={8}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 36,
                  alignSelf: 'flex-start',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <ChevronLeft size={18} color={colors.primaryText} />
              <Text variant="body" color="primaryText">
                Назад
              </Text>
            </Pressable>
          ) : null}
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Поиск раздела…"
            accessibilityLabel="Поиск по разделам"
            testID="tools-search"
          />
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.key}
          // Разделов немного: рендерим все группы сразу (виртуализация
          // режет хвост списка — «Аккаунт» не долетал до DOM).
          initialNumToRender={40}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          renderSectionHeader={({ section }) => (
            <View
              style={{
                backgroundColor: colors.background,
                paddingHorizontal: spacing.md,
                paddingTop: spacing.md,
                paddingBottom: spacing.xs,
              }}
            >
              <Text variant="caption" color="textSecondary">
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <ToolRow
              label={item.label}
              icon={item.icon}
              badge={item.badgeKind === 'notifications' ? unread : 0}
              onPress={() => router.push(item.route)}
              testID={`tools-item-${item.key}`}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={{ paddingHorizontal: spacing.md }}>
              <Divider />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={SearchX}
              title="Раздел не найден"
              compact
              description={`По запросу «${search}» разделов нет. Проверьте написание — или сбросьте поиск.`}
            />
          }
        />
      </View>
    </RoleScreen>
  );
}

/** Строка раздела: иконка, название, бейдж, шеврон. */
function ToolRow({
  label,
  icon: Icon,
  badge,
  onPress,
  testID,
}: {
  label: string;
  icon: LucideIcon;
  badge: number;
  onPress: () => void;
  testID?: string;
}) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: 56,
          paddingVertical: 6,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Icon size={20} color={colors.textSecondary} />
      <Text variant="body" style={{ flex: 1 }}>
        {label}
      </Text>
      {badge > 0 ? (
        <Badge variant="info" size="sm">
          {badge > 99 ? '99+' : String(badge)}
        </Badge>
      ) : null}
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}
