/**
 * Лента (feed) — экран роли «владелец точки».
 *
 * До подключения поставщиков — обещание с действием (аудит Промта 8).
 */
import { Newspaper } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import { useContextSheetStore } from '../../../stores/contextSheetStore';

export default function FeedScreen() {
  const openSheet = useContextSheetStore((s) => s.open);
  return (
    <RoleScreen role="store_owner" section="feed" title="Лента">
      <EmptyState
        icon={Newspaper}
        title="Предложения поставщиков появятся здесь"
        description="Подключите оптовых продавцов — и свежие цены на закупку будут собираться в этой ленте."
        action={{ label: 'Переключить контекст', onPress: openSheet }}
      />
    </RoleScreen>
  );
}
