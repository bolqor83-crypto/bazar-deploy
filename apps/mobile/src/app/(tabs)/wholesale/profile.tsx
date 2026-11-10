/**
 * Профиль (profile) — экран-заглушка роли «оптовик».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { User } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function ProfileScreen() {
  return (
    <RoleScreen role="wholesale_seller" section="profile" title="Профиль">
      <EmptyState
        icon={User}
        title="Профиль в разработке"
        description="Данные компании и управление командой появятся после подключения API."
      />
    </RoleScreen>
  );
}
