/**
 * Orders — экран роли «покупатель».
 * Общая реализация: components/screens/OrdersScreen.tsx
 * (Промт 9, Части D+E: контур задаёт организацию заказов).
 * Оболочка RoleScreen: шапка + таб-бар.
 */
import { default as OrdersScreen } from '../../../components/screens/OrdersScreen';
import { MarketRouteButton } from '../../../components/screens/MarketRouteButton';
import { RoleScreen } from '../../../components/shell/RoleScreen';

export default function Screen() {
  return (
    <RoleScreen
      role="customer"
      section="orders"
      title="Заказы"
      headerRight={<MarketRouteButton basePath="customer" />}
    >
      <OrdersScreen basePath="customer" />
    </RoleScreen>
  );
}
