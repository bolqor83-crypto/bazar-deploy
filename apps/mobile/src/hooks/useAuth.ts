/**
 * useAuth — обёртка над селекторами authStore для экранов.
 *
 * Возвращает состояние, пользователя, флаг готовности и действия.
 * Селекторы по отдельным полям: лишние ререндеры не нужны.
 */
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const state = useAuthStore((s) => s.state);
  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.error);

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const loginWithOtp = useAuthStore((s) => s.loginWithOtp);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const logout = useAuthStore((s) => s.logout);
  const clearError = useAuthStore((s) => s.clearError);
  const lastDevCode = useAuthStore((s) => s.lastDevCode);

  return {
    state,
    user,
    error,
    lastDevCode,
    isAuthenticated: state === 'authenticated',
    isUnknown: state === 'unknown',
    login,
    register,
    loginWithOtp,
    sendOtp,
    requestPasswordReset,
    resetPassword,
    logout,
    clearError,
  };
}
