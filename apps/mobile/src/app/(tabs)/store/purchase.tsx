/**
 * Закупка (purchase) — экран-заглушка роли «владелец точки».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { ShoppingCart } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function PurchaseScreen() {
  return (
    <RoleScreen role="store_owner" section="purchase" title="Закупка">
      <EmptyState
        icon={ShoppingCart}
        title="Пока нет активной закупки"
        description="Соберите список на завтра."
        action={{ label: 'Создать закупку', onPress: () => {} }}
      />
    </RoleScreen>
  );
}
