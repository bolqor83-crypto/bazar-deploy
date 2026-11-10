/**
 * Стор системной цветовой схемы (light/dark по настройкам ОС).
 * Обновляется слушателем Appearance в ThemeProvider.
 */
import { Appearance } from 'react-native';
import { create } from 'zustand';

export type SystemScheme = 'light' | 'dark';

interface SystemSchemeState {
  scheme: SystemScheme;
  setScheme: (scheme: SystemScheme) => void;
}

function initialScheme(): SystemScheme {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

export const useSystemSchemeStore = create<SystemSchemeState>((set) => ({
  scheme: initialScheme(),
  setScheme: (scheme) => set({ scheme }),
}));
