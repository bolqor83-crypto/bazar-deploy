/**
 * BottomTabBar — кастомный таб-бар (не дефолтный из Expo Router,
 * чтобы полностью контролировать стиль и поведение).
 *
 * Высота 64 + safe area снизу. Активная вкладка — primary.
 * Зона нажатия каждого пункта ≥ 48×48. Haptic selection при смене.
 */
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Text, hapticSelection, useTheme } from '@bazar/ui';
import type { TabItem } from './navigation';

const BAR_HEIGHT = 64;

export interface BottomTabBarProps {
  items: TabItem[];
  activeKey: string | null;
  onChange: (key: string) => void;
}

export function BottomTabBar({ items, activeKey, onChange }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const containerStyle: StyleProp<ViewStyle> = {
    height: BAR_HEIGHT + insets.bottom,
    paddingBottom: insets.bottom,
    backgroundColor: isDark ? colors.backgroundElevated : colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
  };

  return (
    <View style={containerStyle}>
      {items.map((item) => {
        const active = item.key === activeKey;
        const Icon = item.icon;

        const itemStyle: StyleProp<ViewStyle> = {
          flex: 1,
          minHeight: BAR_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        };

        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => {
              hapticSelection();
              onChange(item.key);
            }}
            style={({ pressed }) => [itemStyle, pressed ? { opacity: 0.7 } : null]}
          >
            <View>
              <Icon size={22} color={active ? colors.primary : colors.textSecondary} />
              {typeof item.badge === 'number' && item.badge > 0 ? (
                <View style={{ position: 'absolute', top: -4, right: -10 }}>
                  <Badge variant="danger" size="sm">
                    {item.badge > 99 ? '99+' : String(item.badge)}
                  </Badge>
                </View>
              ) : null}
            </View>
            <Text
              variant="caption"
              color={active ? 'primaryText' : 'textSecondary'}
              style={active ? { fontFamily: 'Inter_600SemiBold' } : undefined}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
