/**
 * Провайдер темы Bazar.
 *
 * Сама тема живёт в Zustand-сторе (useThemeStore), поэтому провайдер
 * не держит состояние: он только подписывается на системную схему
 * (режим «system») и отражает её в useSystemSchemeStore.
 */
import { useEffect, type ReactNode } from 'react';
import { Appearance } from 'react-native';
import { useSystemSchemeStore } from './systemScheme';

export interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      useSystemSchemeStore.getState().setScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => subscription.remove();
  }, []);

  return <>{children}</>;
}
