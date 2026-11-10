/**
 * Заметки (notes) — экран-заглушка роли «владелец точки».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { StickyNote } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function NotesScreen() {
  return (
    <RoleScreen role="store_owner" section="notes" title="Заметки">
      <EmptyState
        icon={StickyNote}
        title="Заметок пока нет"
        description="Короткие записи о товарах и поставщиках — чтобы не держать всё в голове."
      />
    </RoleScreen>
  );
}
