/**
 * В пути (in-transit) — экран-заглушка роли «перевозчик».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Truck } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function InTransitScreen() {
  return (
    <RoleScreen role="carrier" section="in-transit" title="В пути">
      <EmptyState
        icon={Truck}
        title="Активных рейсов нет"
        description="Здесь будут текущие маршруты: адреса, контактные лица и статусы доставки."
      />
    </RoleScreen>
  );
}
