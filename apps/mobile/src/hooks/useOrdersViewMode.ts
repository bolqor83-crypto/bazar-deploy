/**
 * useOrdersViewMode — режим списка заказов с персистом
 * (Промт 15, Часть E).
 *
 * «grouped» (по умолчанию) — заказы сгруппированы по контрагенту;
 * «chronological» — плоская хронология как раньше (регрессия
 * сохранена). Выбор пишется в AsyncStorage сразу при переключении
 * — без кнопки «Сохранить»; читается при монтировании. Пока идёт
 * чтение — режим по умолчанию (grouped), экран не ждёт.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type OrdersViewMode = 'grouped' | 'chronological';

const STORAGE_KEY = 'bazar.orders.viewMode';

export function useOrdersViewMode() {
  const [viewMode, setViewMode] = useState<OrdersViewMode>('grouped');

  // Чтение сохранённого режима: молча, без блокировки экрана.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (alive && (stored === 'grouped' || stored === 'chronological')) {
          setViewMode(stored);
        }
      })
      .catch(() => {
        // Хранилище недоступно — остаётся режим по умолчанию.
      });
    return () => {
      alive = false;
    };
  }, []);

  /** Переключение: состояние меняется сразу, персист — в фоне. */
  const changeViewMode = useCallback((mode: OrdersViewMode) => {
    setViewMode(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {
      // Запись не удалась — режим всё равно применён до перезапуска.
    });
  }, []);

  return { viewMode, changeViewMode } as const;
}
