/**
 * Долги (debts) — экран-заглушка роли «владелец точки».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { ReceiptText } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function DebtsScreen() {
  return (
    <RoleScreen role="store_owner" section="debts" title="Долги">
      <EmptyState
        icon={ReceiptText}
        title="Долгов пока нет. Когда появятся — увидите здесь."
      />
    </RoleScreen>
  );
}
