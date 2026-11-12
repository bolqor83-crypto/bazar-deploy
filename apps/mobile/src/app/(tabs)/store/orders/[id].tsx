/**
 * Карточка заказа — экран роли «владелец точки».
 * Общая реализация: components/screens/OrderDetailScreen.tsx (Промт 9).
 */
import { useLocalSearchParams } from 'expo-router';
import { default as OrderDetailScreen } from '../../../../components/screens/OrderDetailScreen';

export default function Screen() {
  const params = useLocalSearchParams<{ id: string }>();
  const orderId = typeof params.id === 'string' ? params.id : '';
  return <OrderDetailScreen basePath="store" orderId={orderId} />;
}
