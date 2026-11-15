/**
 * Карточка доставки — экран роли «оптовик» (Промт 10, Часть D).
 * Общая реализация: components/screens/DeliveryDetailScreen.tsx.
 */
import { useLocalSearchParams } from 'expo-router';
import DeliveryDetailScreen from '../../../../components/screens/DeliveryDetailScreen';

export default function Screen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  return <DeliveryDetailScreen role="wholesale_seller" deliveryId={id} />;
}
