/**
 * Профиль (profile) — экран-заглушка роли «покупатель».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { User } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function ProfileScreen() {
  return (
    <RoleScreen role="customer" section="profile" title="Профиль">
      <EmptyState
        icon={User}
        title="Профиль в разработке"
        description="Имя, телефон и данные организаций появятся здесь после подключения API."
      />
    </RoleScreen>
  );
}
