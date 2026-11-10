/**
 * Финансы (finance) — экран-заглушка роли «оптовик».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Banknote } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function FinanceScreen() {
  return (
    <RoleScreen role="wholesale_seller" section="finance" title="Финансы">
      <EmptyState
        icon={Banknote}
        title="Финансы в разработке"
        description="Взаиморасчёты с клиентами появятся после интеграции с учётной системой."
      />
    </RoleScreen>
  );
}
