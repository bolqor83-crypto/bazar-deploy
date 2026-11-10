/**
 * Избранное (favorites) — экран-заглушка роли «покупатель».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Heart } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function FavoritesScreen() {
  return (
    <RoleScreen role="customer" section="favorites" title="Избранное">
      <EmptyState
        icon={Heart}
        title="Список избранного пуст"
        description="Добавляйте товары, которые заказываете часто, — они всегда будут под рукой."
      />
    </RoleScreen>
  );
}
