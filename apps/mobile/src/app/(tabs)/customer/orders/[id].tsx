/**
 * Карточка заказа — экран роли «покупатель».
 * Общая реализация: components/screens/OrderDetailScreen.tsx (Промт 9).
 */
import { useLocalSearchParams } from 'expo-router';
import { default as OrderDetailScreen } from '../../../../components/screens/OrderDetailScreen';

export default function Screen() {
  const params = useLocalSearchParams<{ id: string }>();
  const orderId = typeof params.id === 'string' ? params.id : '';
  return <OrderDetailScreen basePath="customer" orderId={orderId} />;
}
