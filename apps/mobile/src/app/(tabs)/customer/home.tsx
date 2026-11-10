/**
 * Главная (home) — экран-заглушка роли «покупатель».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Home } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function HomeScreen() {
  return (
    <RoleScreen role="customer" section="home" title="Главная">
      <EmptyState
        icon={Home}
        title="Главная пока готовится"
        description="Здесь появятся категории товаров и быстрый доступ к повторным покупкам."
      />
    </RoleScreen>
  );
}
