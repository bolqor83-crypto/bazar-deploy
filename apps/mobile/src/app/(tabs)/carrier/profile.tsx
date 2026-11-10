/**
 * Профиль (profile) — экран-заглушка роли «перевозчик».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { User } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function ProfileScreen() {
  return (
    <RoleScreen role="carrier" section="profile" title="Профиль">
      <EmptyState
        icon={User}
        title="Профиль в разработке"
        description="Данные перевозчика и документы на транспорт появятся после подключения API."
      />
    </RoleScreen>
  );
}
