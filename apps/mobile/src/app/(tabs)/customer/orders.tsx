/**
 * Заказы (orders) — экран-заглушка роли «покупатель».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Package } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function OrdersScreen() {
  return (
    <RoleScreen role="customer" section="orders" title="Заказы">
      <EmptyState
        icon={Package}
        title="Заказов пока нет"
        description="Когда оформите первый заказ, он появится здесь."
      />
    </RoleScreen>
  );
}
