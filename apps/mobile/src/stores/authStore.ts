/**
 * Стор аутентификации Bazar (Промт 7: реальный API).
 *
 * Токены: access-JWT — только в памяти (client.ts), refresh — в
 * AsyncStorage (bazar.auth.refresh). Гидратация: refresh → /me.
 *
 * После успешного входа стор синхронизирует contextStore «снимком
 * мира»: членства/организации/точки из API + локальные данные
 * онбординга (моки до Промта 8). При выходе — полная очистка.
 *
 * Все операции поглощают ошибки: текст на русском пишется в
 * state.error, наружу исключения не летят.
 */
import { create } from 'zustand';
import type {
  AuthErrorCode,
  AuthState,
  AuthUser,
  WorldSnapshot,
} from '@bazar/types';
import { AuthError } from '@bazar/types';
import {
  clearTokens,
  migrateRefreshTokenStorage,
  setSessionExpiredHandler,
  tryRefresh,
} from '../services/api/client';
import {
  authApi,
  type LoginData,
  type RegisterData,
} from '../services/api/authApi';
import { onboardingMockService } from '../services/onboardingMock';
import { useContextStore } from './contextStore';
import { useOnboardingStore } from './onboardingStore';

export interface AuthStoreState {
  state: AuthState;
  user: AuthUser | null;
  /** Access-токен в памяти (для запросов); null после logout. */
  token: string | null;
  error: string | null;
  /** DEV-код OTP из ответа API (только в dev-режиме сервера). */
  lastDevCode: string | null;

  hydrate: () => Promise<void>;
  /** Обновляет данные пользователя по активной сессии (онбординг). */
  refreshUser: () => Promise<void>;
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

/** Человекочитаемые тексты ошибок по кодам API. */
const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  AUTH_INVALID_PHONE: 'Введите корректный номер телефона',
  AUTH_INVALID_PASSWORD: 'Неверный номер или пароль',
  // Не раскрываем, что именно неверно — номер или пароль.
  AUTH_INVALID_CREDENTIALS: 'Неверный номер или пароль',
  AUTH_USER_NOT_FOUND: 'Неверный номер или пароль',
  AUTH_USER_EXISTS: 'Этот номер уже зарегистрирован',
  AUTH_OTP_INVALID: 'Неверный код. Проверьте и попробуйте ещё раз',
  AUTH_OTP_EXPIRED: 'Код истёк. Запросите новый',
  AUTH_UNAUTHORIZED: 'Сессия истекла. Войдите заново',
  AUTH_SESSION_EXPIRED: 'Сессия истекла. Войдите заново',
  AUTH_RATE_LIMIT: 'Слишком много попыток. Подождите минуту',
  AUTH_UNKNOWN: 'Что-то пошло не так. Попробуйте ещё раз',
  NETWORK_ERROR: 'Сервер временно недоступен. Проверьте связь',
};

function messageFor(error: unknown): string {
  if (error instanceof AuthError) {
    return ERROR_MESSAGES[error.code] ?? ERROR_MESSAGES.AUTH_UNKNOWN;
  }
  return ERROR_MESSAGES.AUTH_UNKNOWN;
}

/**
 * «Снимок мира»: данные API + локальный онбординг пользователя
 * (до миграции онбординга на API в Промте 8).
 */
async function worldWithOnboarding(
  userId: string,
  world: WorldSnapshot,
): Promise<WorldSnapshot> {
  try {
    const local = await onboardingMockService.listForUser(userId);
    const organizations = [...world.organizations];
    for (const org of local.organizations) {
      if (!organizations.some((o) => o.id === org.id)) {
        organizations.push(org);
      }
    }
    const locations = [...world.locations];
    for (const loc of local.locations) {
      if (!locations.some((l) => l.id === loc.id)) {
        locations.push(loc);
      }
    }
    const memberships = [...world.memberships];
    for (const membership of local.memberships) {
      if (
        !memberships.some(
          (m) =>
            m.organizationId === membership.organizationId &&
            m.role === membership.role,
        )
      ) {
        memberships.push(membership);
      }
    }
    return { memberships, organizations, locations };
  } catch {
    // Локальный онбординг недоступен — работаем с данными API.
    return world;
  }
}

/** Применяет результат аутентификации к стору и контексту. */
async function applyAuthResult(
  set: (partial: Partial<AuthStoreState>) => void,
  result: {
    user: AuthUser;
    accessToken: string;
    world: WorldSnapshot;
  },
): Promise<void> {
  set({
    state: 'authenticated',
    user: result.user,
    token: result.accessToken,
    error: null,
  });
  const world = await worldWithOnboarding(result.user.id, result.world);
  useContextStore.getState().syncWithUser(result.user.id, world);
}

export const useAuthStore = create<AuthStoreState>()((set, get) => ({
  state: 'unknown',
  user: null,
  token: null,
  error: null,
  lastDevCode: null,

  hydrate: async () => {
    // SSR (статический экспорт Expo web): хранилища нет — сразу гость.
    if (typeof window === 'undefined') {
      set({ state: 'unauthenticated', user: null, token: null, error: null });
      return;
    }

    // Есть ли refresh-токен для восстановления сессии. Сначала —
    // миграция из AsyncStorage (Промты 7–9) в безопасное хранилище.
    await migrateRefreshTokenStorage();
    const refreshed = await tryRefresh();
    if (!refreshed) {
      set({ state: 'unauthenticated', user: null, token: null, error: null });
      return;
    }

    try {
      const result = await authApi.getSession();
      await applyAuthResult(set, result);
    } catch {
      // Refresh прошёл, но /me упал (сеть): остаёмся гостем —
      // следующий заход повторит попытку.
      set({ state: 'unauthenticated', user: null, token: null, error: null });
    }
  },

  /**
   * Обновляет пользователя и контекст по активной сессии. Вызывается
   * после создания членства в онбординге: /me отдаёт свежие членства,
   * локальные онбординг-данные подмешиваются поверх. Ошибки
   * поглощаются — текущее состояние остаётся рабочим.
   */
  refreshUser: async () => {
    const { state, token } = get();
    if (state !== 'authenticated' || !token) {
      return;
    }
    try {
      const result = await authApi.getSession();
      await applyAuthResult(set, result);
    } catch {
      // Обновление не удалось — работаем с прежними данными.
    }
  },

  register: async (data) => {
    set({ error: null });
    try {
      const result = await authApi.register(data);
      await applyAuthResult(set, result);
      return true;
    } catch (error) {
      set({ error: messageFor(error) });
      return false;
    }
  },

  login: async (data) => {
    set({ error: null });
    try {
      const result = await authApi.login(data);
      await applyAuthResult(set, result);
      return true;
    } catch (error) {
      set({ error: messageFor(error) });
      return false;
    }
  },

  loginWithOtp: async (phone, code) => {
    set({ error: null });
    try {
      const result = await authApi.loginWithOtp(phone, code);
      await applyAuthResult(set, result);
      return true;
    } catch (error) {
      set({ error: messageFor(error) });
      return false;
    }
  },

  sendOtp: async (phone) => {
    set({ error: null, lastDevCode: null });
    try {
      const { sent, devCode } = await authApi.sendOtp(phone, 'login');
      set({ lastDevCode: devCode });
      return sent;
    } catch (error) {
      set({ error: messageFor(error) });
      return false;
    }
  },

  requestPasswordReset: async (phone) => {
    set({ error: null, lastDevCode: null });
    try {
      const { sent, devCode } = await authApi.sendOtp(phone, 'password_reset');
      set({ lastDevCode: devCode });
      return sent;
    } catch (error) {
      set({ error: messageFor(error) });
      return false;
    }
  },

  resetPassword: async (phone, otp, newPassword) => {
    set({ error: null });
    try {
      const result = await authApi.resetPassword(phone, otp, newPassword);
      await applyAuthResult(set, result);
      return true;
    } catch (error) {
      set({ error: messageFor(error) });
      return false;
    }
  },

  logout: async () => {
    set({ state: 'unauthenticated', user: null, token: null, error: null });
    // Отзыв сессии на сервере — лучший труд: локальное состояние
    // очищается в любом случае.
    try {
      await authApi.logout();
    } catch {
      // Сеть недоступна: refresh-токен всё равно стирается ниже.
    }
    clearTokens();
    useContextStore.getState().reset();
    // Онбординг принадлежит сессии: новому пользователю — с чистого
    // шага выбора роли, черновики прежнего не протекают.
    useOnboardingStore.getState().reset();
  },

  clearError: () => {
    set({ error: null });
  },
}));

/**
 * Авто-logout при безнадёжной сессии: клиент не смог обновить
 * access при 401 (refresh отозван/истёк). Регистрируется один раз.
 */
let handlerRegistered = false;
if (!handlerRegistered) {
  handlerRegistered = true;
  setSessionExpiredHandler(async () => {
    await useAuthStore.getState().logout();
  });
}

/** Только для тестов: сброс к исходному состоянию. */
export function __resetAuthStoreForTests(): void {
  useAuthStore.setState({
    state: 'unknown',
    user: null,
    token: null,
    error: null,
    lastDevCode: null,
  });
}
