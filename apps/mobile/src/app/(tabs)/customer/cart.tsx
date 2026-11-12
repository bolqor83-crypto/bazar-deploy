/**
 * Cart — экран роли «покупатель».
 * Общая реализация: components/screens/CartScreen.ts
 * (Промт 9, Части D+E: контур задаёт organizationId корзины).
 */
import { default as CartScreen } from '../../../components/screens/CartScreen';

export default function Screen() {
  return <CartScreen basePath="customer" />;
}
