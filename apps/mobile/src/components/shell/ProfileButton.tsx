/**
 * ProfileButton — аватар с инициалами в шапке.
 * Тап ведёт на профиль активной роли.
 *
 * Имя и инициалы — текущий пользователь из authStore (после Промта 4);
 * пока сессия не известна — мок-пользователь Промта 3.
 */
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, hapticTap, useTheme } from '@bazar/ui';
import { useContextStore } from '../../stores/contextStore';
import { useAuthStore } from '../../stores/authStore';
import { mockUser } from '../../mocks/context';
import { routeFor } from './navigation';

const AVATAR_SIZE = 36;

/** Инициалы из имени: первые буквы имени и фамилии. */
function initialsOf(name: string): string {
  const [first = '', second = ''] = name.trim().split(/\s+/).filter(Boolean);
  if (!first) {
    return '??';
  }
  if (!second) {
    return first.slice(0, 2).toUpperCase();
  }
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

export function ProfileButton() {
  const router = useRouter();
  const { colors } = useTheme();
  const role = useContextStore((s) => s.active.role);
  const user = useAuthStore((s) => s.user);

  const name = user?.name ?? mockUser.fullName;
  const initials = user ? initialsOf(user.name) : mockUser.initials;

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
      accessibilityLabel={`Профиль: ${name}`}
      hitSlop={6}
      onPress={() => {
        hapticTap();
        router.replace(routeFor(role, 'profile'));
      }}
      style={({ pressed }) => [
        containerStyle,
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <View accessible={false}>
        <Text
          variant="caption"
          color="primaryText"
          style={{ fontWeight: '600' }}
        >
          {initials}
        </Text>
      </View>
    </Pressable>
  );
}
