/**
 * Профиль (profile) — экран роли «оптовик».
 *
 * Карточка пользователя и выход из аккаунта с подтверждением.
 * Управление организациями — после подключения API (Промт 5–6).
 */
import { View } from 'react-native';
import { useTheme } from '@bazar/ui';
import { LogoutSection } from '../../../components/auth/LogoutSection';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function ProfileScreen() {
  return (
    <RoleScreen role="wholesale_seller" section="profile" title="Профиль">
      <ProfileWrapper>
        <LogoutSection />
      </ProfileWrapper>
    </RoleScreen>
  );
}

/** Единый отступ экрана профиля (ранее был внутри LogoutSection). */
function ProfileWrapper({ children }: { children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.md, gap: spacing.md, width: '100%' }}>
      {children}
    </View>
  );
}
