/**
 * Заявки (my-requests) — экран-заглушка роли «перевозчик».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Inbox } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function MyRequestsScreen() {
  return (
    <RoleScreen role="carrier" section="my-requests" title="Заявки">
      <EmptyState
        icon={Inbox}
        title="Принятых заявок пока нет"
        description="Заявки на доставку, по которым вы откликнулись, появятся здесь."
      />
    </RoleScreen>
  );
}
