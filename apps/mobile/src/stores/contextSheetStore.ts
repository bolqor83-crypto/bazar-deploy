/**
 * Состояние шита переключения контекста.
 *
 * Шит рендерится в AppHeader, но открыть его может любой экран —
 * например, кнопкой «Переключить контекст» в пустом состоянии
 * (визуальный аудит Промта 8, Часть A: экран должен помогать,
 * а не только сообщать).
 */
import { create } from 'zustand';

interface ContextSheetState {
  visible: boolean;
  open: () => void;
  close: () => void;
}

export const useContextSheetStore = create<ContextSheetState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
