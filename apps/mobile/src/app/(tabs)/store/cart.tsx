/**
 * Cart — экран роли «владелец точки».
 * Общая реализация: components/screens/CartScreen.tsx
 * (Промт 9, Части D+E: контур задаёт organizationId корзины).
 * Оболочка RoleScreen: раздел «Закупка» — корзина часть закупки.
 */
import { default as CartScreen } from '../../../components/screens/CartScreen';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function Screen() {
  return (
    <RoleScreen role="store_owner" section="purchase" title="Корзина">
      <CartScreen basePath="store" />
    </RoleScreen>
  );
}
