/**
 * Сотрудники (staff) — экран-заглушка роли «оптовик» (Промт 12, Часть D).
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Users } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function StaffScreen() {
  return (
    <RoleScreen role="wholesale_seller" section="staff" title="Сотрудники">
      <EmptyState
        icon={Users}
        title="Сотрудники в разработке"
        description="Управление доступами команды появится в следующем обновлении."
      />
    </RoleScreen>
  );
}
