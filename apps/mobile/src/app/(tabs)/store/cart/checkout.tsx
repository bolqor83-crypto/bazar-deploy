/**
 * Checkout — экран роли «владелец точки».
 * Общая реализация: components/screens/CheckoutScreen.ts
 * (Промт 9, Части D+E: контур задаёт organizationId корзины).
 */
import { default as CheckoutScreen } from '../../../../components/screens/CheckoutScreen';

export default function Screen() {
  return <CheckoutScreen basePath="store" />;
}
