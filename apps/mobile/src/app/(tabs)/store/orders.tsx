/**
 * Orders — экран роли «владелец точки».
 * Общая реализация: components/screens/OrdersScreen.ts
 * (Промт 9, Части D+E: контур задаёт organizationId корзины).
 */
import { default as OrdersScreen } from '../../../components/screens/OrdersScreen';

export default function Screen() {
  return <OrdersScreen basePath="store" />;
}
