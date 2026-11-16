/**
 * Заметки (notes) — экран-заглушка роли «оптовик» (Промт 12, Часть D).
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { StickyNote } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function NotesScreen() {
  return (
    <RoleScreen role="wholesale_seller" section="notes" title="Заметки">
      <EmptyState
        icon={StickyNote}
        title="Заметки в разработке"
        description="Быстрые записи о клиентах и поставках появятся в следующем обновлении."
      />
    </RoleScreen>
  );
}
