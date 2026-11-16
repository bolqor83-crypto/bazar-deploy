/**
 * Организация — экран-заглушка роли «оптовик» (Промт 12, Часть D).
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Store } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function OrganizationScreen() {
  return (
    <RoleScreen
      role="wholesale_seller"
      section="organization"
      title="Организация"
    >
      <EmptyState
        icon={Store}
        title="Карточка организации в разработке"
        description="Реквизиты, склады и точки продаж вашей организации появятся здесь."
      />
    </RoleScreen>
  );
}
