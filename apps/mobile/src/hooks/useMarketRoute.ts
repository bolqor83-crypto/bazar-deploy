/**
 * Хуки маршрута по рынку (Промт 17, Часть B).
 *
 * useMarketRoute — маршрут покупателя (TanStack Query, ключ
 * ['market-route', returnToStart], staleTime 60 с). useMarketVisited —
 * отметки «Пройдено» с персистом в AsyncStorage по дате: при смене
 * даты набор сбрасывается (маршрут — план на одно утро).
 * Отметка мгновенная и оптимистичная — сеть не участвует.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import type { MarketRouteResponse } from '@bazar/types';
import { fetchMarketRoute } from '../services/api/marketApi';

/** Маршрут по рынку (returnToStart — «вернуться к выходу»). */
export function useMarketRoute(returnToStart: boolean) {
  return useQuery<MarketRouteResponse>({
    queryKey: ['market-route', returnToStart],
    queryFn: () => fetchMarketRoute({ returnToStart }),
    staleTime: 60_000,
  });
}

/** Формат даты отметок: YYYY-MM-DD (локальная). */
function todayKey(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

interface VisitedState {
  date: string;
  orderIds: string[];
}

const STORAGE_KEY = 'bazar.marketRoute.visited';

/**
 * Отметки «Пройдено» по дню. Чтение — при монтировании (не
 * блокируя экран: до чтения ни одна не пройдена), запись — сразу
 * при переключении. Смена даты обнуляет набор.
 */
export function useMarketVisited() {
  const [visited, setVisited] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!alive || !stored) return;
        try {
          const parsed = JSON.parse(stored) as VisitedState;
          if (parsed.date === todayKey() && Array.isArray(parsed.orderIds)) {
            setVisited(parsed.orderIds);
          }
          // Дата не совпала — вчерашние отметки игнорируются и
          // перезапишутся первой сегодняшней отметкой.
        } catch {
          // Битое хранилище — начинаем с чистого набора.
        }
      })
      .catch(() => {
        // Хранилище недоступно — отметки живут до перезапуска.
      });
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((orderIds: string[]) => {
    const state: VisitedState = { date: todayKey(), orderIds };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {
      // Запись не удалась — состояние всё равно применено в памяти.
    });
  }, []);

  /** Переключить отметку (оптимистично, без сети). */
  const toggleVisited = useCallback(
    (orderId: string) => {
      setVisited((prev) => {
        const next = prev.includes(orderId)
          ? prev.filter((id) => id !== orderId)
          : [...prev, orderId];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { visited, toggleVisited } as const;
}
