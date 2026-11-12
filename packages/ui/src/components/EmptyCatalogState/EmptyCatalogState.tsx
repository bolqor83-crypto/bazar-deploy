/**
 * EmptyCatalogState — пустое состояние каталога.
 *
 * Осмысленный текст вместо «Нет данных»: ничего не нашлось из-за
 * запроса или фильтров. Действие — сбросить фильтры (когда они
 * заданы) или очистить поиск.
 */
import { SearchX } from 'lucide-react-native';
import { EmptyState } from '../EmptyState';

export interface EmptyCatalogStateProps {
  /** true — показываем кнопку сброса. */
  hasFilters?: boolean;
  onReset?: () => void;
  testID?: string;
}

export function EmptyCatalogState({
  hasFilters = false,
  onReset,
  testID,
}: EmptyCatalogStateProps) {
  return (
    <EmptyState
      icon={SearchX}
      title="Ничего не нашлось"
      description="Попробуйте изменить запрос или сбросить фильтры — в каталоге 30 позиций сезонных товаров."
      action={
        hasFilters && onReset
          ? { label: 'Сбросить фильтры', onPress: onReset }
          : undefined
      }
      testID={testID}
    />
  );
}
