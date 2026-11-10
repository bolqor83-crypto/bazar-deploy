/**
 * Профиль (profile) — экран роли «владелец точки».
 *
 * Карточка пользователя и выход из аккаунта с подтверждением.
 * Управление организациями — после подключения API (Промт 5–6).
 */
import { LogoutSection } from '../../../components/auth/LogoutSection';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function ProfileScreen() {
  return (
    <RoleScreen role="store_owner" section="profile" title="Профиль">
      <LogoutSection />
    </RoleScreen>
  );
}
