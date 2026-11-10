/**
 * Клиенты (clients) — экран-заглушка роли «оптовик».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Users } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function ClientsScreen() {
  return (
    <RoleScreen role="wholesale_seller" section="clients" title="Клиенты">
      <EmptyState
        icon={Users}
        title="Клиентов пока нет"
        description="Ваши розничные партнёры: сети, точки, условия работы."
      />
    </RoleScreen>
  );
}
