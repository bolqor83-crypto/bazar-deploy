/**
 * ContextSwitcher — кнопка текущего контекста в шапке.
 * Показывает организацию/роль; открывает ContextSheet.
 */
import { Building2, ChevronDown, Truck, User } from 'lucide-react-native';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, useTheme } from '@bazar/ui';
import type { Role } from '@bazar/types';
import { useContextStore } from '../../stores/contextStore';
import { formatContextLabel } from './contextUtils';

/** Максимум ширины подписи контекста в шапке. */
const MAX_LABEL_WIDTH = 140;

const ROLE_ICONS: Record<Role, typeof Building2> = {
  customer: User,
  store_owner: Building2,
  wholesale_seller: Building2,
  carrier: Truck,
};

export interface ContextSwitcherProps {
  onPress: () => void;
}

export function ContextSwitcher({ onPress }: ContextSwitcherProps) {
  const { colors, spacing, radii } = useTheme();
  const active = useContextStore((s) => s.active);
  const memberships = useContextStore((s) => s.memberships);

  const label = formatContextLabel(active, memberships);
  const Icon = ROLE_ICONS[active.role];

  const containerStyle: StyleProp<ViewStyle> = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    maxWidth: MAX_LABEL_WIDTH + 2 * spacing.sm + 40,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Контекст: ${label}. Переключить`}
      onPress={onPress}
      style={({ pressed }) => [containerStyle, pressed ? { opacity: 0.7 } : null]}
    >
      <Icon size={18} color={colors.primaryText} />
      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
        <Text
          variant="bodySmall"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ maxWidth: MAX_LABEL_WIDTH }}
        >
          {label}
        </Text>
        <ChevronDown size={16} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}
