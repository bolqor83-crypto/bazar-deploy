/**
 * Доставки (deliveries) — экран-заглушка роли «покупатель».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Truck } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function DeliveriesScreen() {
  return (
    <RoleScreen role="customer" section="deliveries" title="Доставки">
      <EmptyState
        icon={Truck}
        title="Доставок пока нет"
        description="Здесь будут активные доставки: статус, перевозчик и ориентировочное время прибытия."
      />
    </RoleScreen>
  );
}
