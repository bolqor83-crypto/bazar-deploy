/**
 * Стор аутентификации Bazar.
 *
 * Сессия персистится в AsyncStorage под ключом bazar.auth.session
 * (только userId + token), полные данные восстанавливаются через
 * authMockService.getSession().
 *
 * После успешного входа стор синхронизирует contextStore по
 * приоритету членств (wholesale → store_owner → carrier → customer),
 * при выходе — полностью очищает оба стора и хранилище.
 *
 * Все операции поглощают ошибки: текст на русском пишется в
 * state.error, наружу исключения не летят.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { AuthErrorCode, AuthState, AuthUser } from '@bazar/types';
import { AuthError } from '@bazar/types';
import {
  authMockService,
  type LoginData,
  type RegisterData,
} from '../services/authMock';
import { useContextStore } from './contextStore';

export const SESSION_STORAGE_KEY = 'bazar.auth.session';

/** Сохранённая сессия: только идентификатор и токен. */
interface StoredSession {
  userId: string;
  token: string;
}

export interface AuthStoreState {
  state: AuthState;
  user: AuthUser | null;
  token: string | null;
  error: string | null;

  hydrate: () => Promise<void>;
  register: (data: RegisterData) => Promise<boolean>;
  login: (data: LoginData) => Promise<boolean>;
  loginWithOtp: (phone: string, code: string) => Promise<boolean>;
  sendOtp: (phone: string) => Promise<boolean>;
  requestPasswordReset: (phone: string) => Promise<boolean>;
  resetPassword: (
    phone: string,
    otp: string,
    newPassword: string,
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

/** Человекочитаемые тексты ошибок по кодам мок-бэкенда. */
const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  AUTH_INVALID_PHONE: 'Введите корректный номер телефона',
  // Не раскрываем, что именно неверно — номер или пароль.
  AUTH_INVALID_PASSWORD: 'Неверный номер или пароль',
  AUTH_USER_NOT_FOUND: 'Неверный номер или пароль',
  AUTH_USER_EXISTS: 'Этот номер уже зарегистрирован',
  AUTH_OTP_INVALID: 'Неверный код. Проверьте и попробуйте ещё раз',
  AUTH_OTP_EXPIRED: 'Код истёк. Запросите новый',
  AUTH_UNKNOWN: 'Что-то пошло не так. Попробуйте ещё раз',
};

function messageFor(error: unknown): string {
  if (error instanceof AuthError) {
    return ERROR_MESSAGES[error.code] ?? ERROR_MESSAGES.AUTH_UNKNOWN;
  }
  return ERROR_MESSAGES.AUTH_UNKNOWN;
}

export const useAuthStore = create<AuthStoreState>()((set, get) => ({
  state: 'unknown',
  user: null,
  token: null,
  error: null,

  hydrate: async () => {
    // SSR (статический экспорт Expo web): хранилища нет — сразу гость.
    if (typeof window === 'undefined') {
      set({ state: 'unauthenticated', user: null, token: null, error: null });
      return;
    }

    let stored: StoredSession | null = null;
    try {
      const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      stored = raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      stored = null;
    }

    if (!stored?.token) {
      set({ state: 'unauthenticated', user: null, token: null, error: null });
      return;
    }

    const response = await authMockService.getSession(stored.token);
    if (response) {
      set({
        state: 'authenticated',
        user: response.user,
        token: response.session.token,
        error: null,
      });
      // Тот же пользователь: сохраняем выбранный ранее контекст,
      // проверив его по свежим членствам.
      useContextStore
        .getState()
        .syncWithUser(response.user.id, response.user.memberships);
      return;
    }

    // Сессия истекла или невалидна — чистим за собой.
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY).catch(() => undefined);
    set({ state: 'unauthenticated', user: null, token: null, error: null });
  },

  register: async (data) => {
    set({ error: null });
    try {
      const { user, session } = await authMockService.register(data);
      set({ state: 'authenticated', user, token: session.token, error: null });
      await AsyncStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          userId: user.id,
          token: session.token,
        } satisfies StoredSession),
      );
      // Новый пользователь без членств → роль customer.
      useContextStore.getState().syncWithUser(user.id, user.memberships);
      return true;
    } catch (error) {
      set({ error: messageFor(error) });
      return false;
    }
  },

  login: async (data) => {
    set({ error: null });
    try {
      const { user, session } = await authMockService.login(data);
      set({ state: 'authenticated', user, token: session.token, error: null });
      await AsyncStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          userId: user.id,
          token: session.token,
        } satisfies StoredSession),
      );
      // Вход: контекст выбираем по приоритету членств заново.
      useContextStore.getState().syncWithUser(user.id, user.memberships);
      return true;
    } catch (error) {
      set({ error: messageFor(error) });
      return false;
    }
  },

  loginWithOtp: async (phone, code) => {
    set({ error: null });
    try {
      const { user, session } = await authMockService.loginWithOtp(phone, code);
      set({ state: 'authenticated', user, token: session.token, error: null });
      await AsyncStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          userId: user.id,
          token: session.token,
        } satisfies StoredSession),
      );
      useContextStore.getState().syncWithUser(user.id, user.memberships);
      return true;
    } catch (error) {
      set({ error: messageFor(error) });
      return false;
    }
  },

  sendOtp: async (phone) => {
    set({ error: null });
    try {
      await authMockService.sendOtp(phone);
      return true;
    } catch (error) {
      set({ error: messageFor(error) });
      return false;
    }
  },

  requestPasswordReset: async (phone) => {
    set({ error: null });
    try {
      await authMockService.requestPasswordReset(phone);
      return true;
    } catch (error) {
      set({ error: messageFor(error) });
      return false;
    }
  },

  resetPassword: async (phone, otp, newPassword) => {
    set({ error: null });
    try {
      await authMockService.resetPassword(phone, otp, newPassword);
      return true;
    } catch (error) {
      set({ error: messageFor(error) });
      return false;
    }
  },

  logout: async () => {
    const token = get().token;
    set({ state: 'unauthenticated', user: null, token: null, error: null });
    // Полная очистка: сессия на «сервере», OTP-коды, локальная сессия,
    // контекст пользователя.
    try {
      if (token) {
        await authMockService.logout(token);
      }
      await authMockService.clearOtpCodes();
    } catch {
      // Очистка на «сервере» не критична: локальное состояние
      // всё равно удаляется ниже.
    }
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY).catch(() => undefined);
    useContextStore.getState().reset();
  },

  clearError: () => {
    set({ error: null });
  },
}));

/** Только для тестов: сброс к исходному состоянию. */
export function __resetAuthStoreForTests(): void {
  useAuthStore.setState({
    state: 'unknown',
    user: null,
    token: null,
    error: null,
  });
}
