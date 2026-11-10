/**
 * Витрина (storefront) — экран-заглушка роли «владелец точки».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Store } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function StorefrontScreen() {
  return (
    <RoleScreen role="store_owner" section="storefront" title="Витрина">
      <EmptyState
        icon={Store}
        title="Витрина точки в разработке"
        description="Здесь будет оформление витрины вашей розничной точки: товары, цены, выкладка."
      />
    </RoleScreen>
  );
}
