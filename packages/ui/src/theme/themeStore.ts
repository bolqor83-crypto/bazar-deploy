/**
 * Стор темы Bazar: light / dark / system.
 * Персистентность — AsyncStorage, ключ bazar.theme.mode.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Безопасное хранилище: при серверном рендеринге (статический экспорт
 * Expo web) window/AsyncStorage недоступны — используем no-op.
 */
function getSafeStorage(): StateStorage {
  if (typeof window === 'undefined') {
    return {
      getItem: async () => null,
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
  }
  return AsyncStorage;
}

export const THEME_STORAGE_KEY = 'bazar.theme.mode';

const MODES: ThemeMode[] = ['light', 'dark', 'system'];

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (MODES as string[]).includes(value);
}

interface ThemeState {
  mode: ThemeMode;
  /** Гидратация из AsyncStorage завершена. */
  hydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  /** Циклическое переключение light → dark → system → light. */
  cycleMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      hydrated: false,
      setMode: (mode) => set({ mode }),
      cycleMode: () => {
        const index = MODES.indexOf(get().mode);
        const next = MODES[(index + 1) % MODES.length] ?? 'system';
        set({ mode: next });
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(getSafeStorage),
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        const mode = state?.mode;
        useThemeStore.setState({
          mode: isThemeMode(mode) ? mode : 'system',
          hydrated: true,
        });
      },
    }
  )
);
