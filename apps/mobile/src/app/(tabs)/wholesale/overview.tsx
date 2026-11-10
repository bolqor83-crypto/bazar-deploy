/**
 * Обзор (overview) — экран-заглушка роли «оптовик».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { LayoutDashboard } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function OverviewScreen() {
  return (
    <RoleScreen role="wholesale_seller" section="overview" title="Обзор">
      <EmptyState
        icon={LayoutDashboard}
        title="Обзор в разработке"
        description="Ключевые метрики оптовой компании: заказы, выручка, отгрузки."
      />
    </RoleScreen>
  );
}
