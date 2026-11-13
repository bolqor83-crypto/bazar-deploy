/**
 * Orders — экран роли «владелец точки».
 * Общая реализация: components/screens/OrdersScreen.tsx
 * (Промт 9, Части D+E: контур задаёт организацию заказов).
 * Оболочка RoleScreen: шапка + таб-бар.
 */
import { default as OrdersScreen } from '../../../components/screens/OrdersScreen';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function Screen() {
  return (
    <RoleScreen role="store_owner" section="orders" title="Заказы">
      <OrdersScreen basePath="store" />
    </RoleScreen>
  );
}
