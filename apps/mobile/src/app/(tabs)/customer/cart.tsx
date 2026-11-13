/**
 * Cart — экран роли «покупатель».
 * Общая реализация: components/screens/CartScreen.tsx
 * (Промт 9, Части D+E: контур задаёт organizationId корзины).
 * Оболочка RoleScreen: шапка + таб-бар с badge корзины.
 */
import { default as CartScreen } from '../../../components/screens/CartScreen';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function Screen() {
  return (
    <RoleScreen role="customer" section="cart" title="Корзина">
      <CartScreen basePath="customer" />
    </RoleScreen>
  );
}
