/**
 * Заказы (orders) — экран-заглушка роли «оптовик».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { ClipboardList } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function OrdersScreen() {
  return (
    <RoleScreen role="wholesale_seller" section="orders" title="Заказы">
      <EmptyState
        icon={ClipboardList}
        title="Заказов пока нет"
        description="Здесь появятся заказы розничных покупателей."
      />
    </RoleScreen>
  );
}
