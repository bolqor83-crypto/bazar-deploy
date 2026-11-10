/**
 * Товары (products) — экран-заглушка роли «оптовик».
 * Бизнес-логики нет: структура навигации и осмысленный EmptyState.
 */
import { Package } from 'lucide-react-native';
import { EmptyState } from '@bazar/ui';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function ProductsScreen() {
  return (
    <RoleScreen role="wholesale_seller" section="products" title="Товары">
      <EmptyState
        icon={Package}
        title="Товаров пока нет"
        description="Оптовый каталог появится здесь: карточки, цены и остатки по складам."
      />
    </RoleScreen>
  );
}
