/**
 * Профиль (profile) — экран-заглушка роли «владелец точки».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { User } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function ProfileScreen() {
  return (
    <RoleScreen role="store_owner" section="profile" title="Профиль">
      <EmptyState
        icon={User}
        title="Профиль в разработке"
        description="Данные организаций и управление точками появятся после подключения API."
      />
    </RoleScreen>
  );
}
