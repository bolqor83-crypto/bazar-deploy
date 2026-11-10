/**
 * Заказы (orders) — экран-заглушка роли «владелец точки».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Package } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function OrdersScreen() {
  return (
    <RoleScreen role="store_owner" section="orders" title="Заказы">
      <EmptyState
        icon={Package}
        title="Заказов точки пока нет"
        description="Здесь появятся заказы покупателей выбранной точки."
      />
    </RoleScreen>
  );
}
