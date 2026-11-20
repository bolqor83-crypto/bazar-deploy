/**
 * Стор уведомлений Toast: очередь без персистентности.
 *
 * Промт 18: действие в уведомлении (кнопка вида «Скопировать лог»).
 * Нажатие на действие закрепляет тост — таймер автоскрытия
 * останавливается, пока пользователь не закроет карточку тапом.
 */
import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

/** Кнопка-действие внутри уведомления. */
export interface ToastAction {
  label: string;
  run: () => void | Promise<void>;
}

export interface ToastData {
  id: number;
  variant: ToastVariant;
  message: string;
  /** Длительность показа в мс. По умолчанию 3000. */
  duration: number;
  /** Необязательное действие: кнопка внутри уведомления. */
  action?: ToastAction;
  /** Закреплено действием: автоскрытие отключено. */
  pinned: boolean;
}

export interface ToastInput {
  variant?: ToastVariant;
  message: string;
  duration?: number;
  action?: ToastAction;
}

interface ToastState {
  queue: ToastData[];
  /** Показать уведомление (ставится в очередь). */
  show: (input: ToastInput) => void;
  /** Скрыть текущее уведомление. */
  dismissCurrent: () => void;
  /** Выполнить действие текущего уведомления и закрепить его. */
  runCurrentAction: () => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  queue: [],
  show: ({ variant = 'info', message, duration = 3000, action }) => {
    const toast: ToastData = {
      id: nextId++,
      variant,
      message,
      duration,
      action,
      pinned: false,
    };
    set({ queue: [...get().queue, toast] });
  },
  dismissCurrent: () => {
    set({ queue: get().queue.slice(1) });
  },
  runCurrentAction: () => {
    const [current, ...rest] = get().queue;
    if (!current?.action) {
      return;
    }
    void current.action.run();
    if (current.pinned) {
      return;
    }
    set({ queue: [{ ...current, pinned: true }, ...rest] });
  },
}));

/** Хук доступа к показу уведомлений из любого места приложения. */
export function useToast(): { show: (input: ToastInput) => void } {
  const show = useToastStore((s) => s.show);
  return { show };
}
