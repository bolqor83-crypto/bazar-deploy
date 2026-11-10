/**
 * Стор уведомлений Toast: очередь без персистентности.
 */
import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastData {
  id: number;
  variant: ToastVariant;
  message: string;
  /** Длительность показа в мс. По умолчанию 3000. */
  duration: number;
}

export interface ToastInput {
  variant?: ToastVariant;
  message: string;
  duration?: number;
}

interface ToastState {
  queue: ToastData[];
  /** Показать уведомление (ставится в очередь). */
  show: (input: ToastInput) => void;
  /** Скрыть текущее уведомление. */
  dismissCurrent: () => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  queue: [],
  show: ({ variant = 'info', message, duration = 3000 }) => {
    const toast: ToastData = { id: nextId++, variant, message, duration };
    set({ queue: [...get().queue, toast] });
  },
  dismissCurrent: () => {
    set({ queue: get().queue.slice(1) });
  },
}));

/** Хук доступа к показу уведомлений из любого места приложения. */
export function useToast(): { show: (input: ToastInput) => void } {
  const show = useToastStore((s) => s.show);
  return { show };
}
