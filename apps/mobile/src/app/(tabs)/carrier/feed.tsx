/**
 * Лента (feed) — экран роли «перевозчик».
 *
 * До первых заявок — обещание с действием (аудит Промта 8).
 */
import { Newspaper } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import { useContextSheetStore } from '../../../stores/contextSheetStore';

export default function FeedScreen() {
  const openSheet = useContextSheetStore((s) => s.open);
  return (
    <RoleScreen role="carrier" section="feed" title="Лента">
      <EmptyState
        icon={Newspaper}
        title="Заявки на перевозку появятся здесь"
        description="Маршруты, груз и ставки — как только торговые точки начнут отправлять заявки."
        action={{ label: 'Переключить контекст', onPress: openSheet }}
      />
    </RoleScreen>
  );
}
