/**
 * Финансы (finance) — экран-заглушка роли «владелец точки».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Banknote } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function FinanceScreen() {
  return (
    <RoleScreen role="store_owner" section="finance" title="Финансы">
      <EmptyState
        icon={Banknote}
        title="Финансы в разработке"
        description="Движение денег, оплаты и сверки появятся здесь после интеграции с учётной системой."
      />
    </RoleScreen>
  );
}
