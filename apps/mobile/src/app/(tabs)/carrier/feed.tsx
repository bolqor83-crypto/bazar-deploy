/**
 * Лента (feed) — экран-заглушка роли «перевозчик».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Newspaper } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function FeedScreen() {
  return (
    <RoleScreen role="carrier" section="feed" title="Лента">
      <EmptyState
        icon={Newspaper}
        title="Лента заявок появится здесь, когда будет API."
      />
    </RoleScreen>
  );
}
