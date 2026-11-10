/**
 * BazarUIProvider — корневой провайдер дизайн-системы.
 *
 * Композиция: ThemeProvider (тема) + ToastProvider (уведомления)
 * + SafeAreaProvider (safe area). Приложение оборачивает корень
 * один раз.
 */
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../theme';
import { ToastProvider } from '../components/Toast';

export interface BazarUIProviderProps {
  children: ReactNode;
}

export function BazarUIProvider({ children }: BazarUIProviderProps) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
