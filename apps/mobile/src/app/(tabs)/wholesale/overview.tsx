/**
 * Обзор (overview) — экран роли «оптовик».
 *
 * До первых заказов — обещание с действием (аудит Промта 8: пустой
 * экран должен помогать, а не сообщать про внутреннюю кухню).
 */
import { LayoutDashboard } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';
import { useContextSheetStore } from '../../../stores/contextSheetStore';

export default function OverviewScreen() {
  const openSheet = useContextSheetStore((s) => s.open);
  return (
    <RoleScreen role="wholesale_seller" section="overview" title="Обзор">
      <EmptyState
        icon={LayoutDashboard}
        title="Показатели соберутся с первыми заказами"
        description="Выручка, отгрузки и ключевые клиенты оптовой компании появятся на этом экране."
        action={{ label: 'Переключить контекст', onPress: openSheet }}
      />
    </RoleScreen>
  );
}
