/**
 * Настройки (settings) — экран-заглушка роли «оптовик».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Settings } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function SettingsScreen() {
  return (
    <RoleScreen role="wholesale_seller" section="settings" title="Настройки">
      <EmptyState
        icon={Settings}
        title="Настройки в разработке"
        description="Пока контекст и тема переключаются из шапки приложения."
      />
    </RoleScreen>
  );
}
