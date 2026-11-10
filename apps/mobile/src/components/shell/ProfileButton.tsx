/**
 * ProfileButton — аватар с инициалами в шапке.
 * Тап ведёт на профиль активной роли.
 */
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, hapticTap, useTheme } from '@bazar/ui';
import { useContextStore } from '../../stores/contextStore';
import { mockUser } from '../../mocks/context';
import { routeFor } from './navigation';

const AVATAR_SIZE = 36;

export function ProfileButton() {
  const router = useRouter();
  const { colors } = useTheme();
  const role = useContextStore((s) => s.active.role);

  const containerStyle: StyleProp<ViewStyle> = {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    // Добираем зону нажатия до ≥48×48.
    marginHorizontal: 6,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Профиль: ${mockUser.fullName}`}
      hitSlop={6}
      onPress={() => {
        hapticTap();
        router.replace(routeFor(role, 'profile'));
      }}
      style={({ pressed }) => [containerStyle, pressed ? { opacity: 0.7 } : null]}
    >
      <View accessible={false}>
        <Text variant="caption" color="primaryText" style={{ fontWeight: '600' }}>
          {mockUser.initials}
        </Text>
      </View>
    </Pressable>
  );
}
