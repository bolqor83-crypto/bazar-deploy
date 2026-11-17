/**
 * Хук похожих товаров (Промт 14a): карусель на карточке товара.
 *
 * Ключ ['similar', productId] — при переходе на другой товар ключ
 * меняется и запрос уходит заново автоматически. staleTime 5 минут:
 * похожие меняются редко, возврат на экран не бьёт в API.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchSimilarProducts } from '../services/api/catalogApi';

/** Похожие товары для карточки товара. */
export function useSimilarProducts(productId: string | undefined) {
  return useQuery({
    queryKey: ['similar', productId],
    queryFn: () => fetchSimilarProducts(productId as string, 10),
    enabled: Boolean(productId),
    staleTime: 5 * 60 * 1000,
  });
}
