/**
 * История (history) — экран-заглушка роли «перевозчик».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { History } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function HistoryScreen() {
  return (
    <RoleScreen role="carrier" section="history" title="История">
      <EmptyState
        icon={History}
        title="История доставок пуста"
        description="Завершённые рейсы и расчёты по ним будут сохраняться здесь."
      />
    </RoleScreen>
  );
}
