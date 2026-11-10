/**
 * Запросы (requests) — экран-заглушка роли «оптовик».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Inbox } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function RequestsScreen() {
  return (
    <RoleScreen role="wholesale_seller" section="requests" title="Запросы">
      <EmptyState
        icon={Inbox}
        title="Заявок пока нет"
        description="Заявки магазинов на поставку и самовывоз появятся здесь."
      />
    </RoleScreen>
  );
}
