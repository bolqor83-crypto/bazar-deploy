/**
 * Аналитика (analytics) — экран-заглушка роли «оптовик».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { BarChart3 } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function AnalyticsScreen() {
  return (
    <RoleScreen role="wholesale_seller" section="analytics" title="Аналитика">
      <EmptyState
        icon={BarChart3}
        title="Аналитика в разработке"
        description="Динамика продаж по товарам и клиентам появится здесь."
      />
    </RoleScreen>
  );
}
