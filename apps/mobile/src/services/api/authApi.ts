/**
 * API аутентификации Bazar (Промт 7, Часть D).
 *
 * Ответы реального API (/api/auth/*) маппятся в типы @bazar/types:
 * роли и типы организаций — в нижний регистр, членства разворачиваются
 * в «снимок мира» для contextStore. Пароли и токены наружу не текут.
 */
import type {
  AuthUser,
  BusinessLocation,
  Membership,
  Organization,
  OrganizationKind,
  Role,
  Tokens,
  WorldSnapshot,
} from '@bazar/types';
import {
  apiRequest,
  getRefreshToken,
  pingApi,
  setAccessToken,
  setRefreshToken,
} from './client';

// ---------------------------------------------------------------------------
// Контракт API (подмножество, которое читает клиент)
// ---------------------------------------------------------------------------

interface ApiOrganization {
  id: string;
  name: string;
  shortName: string;
  kind: string;
}

interface ApiLocation {
  id: string;
  organizationId: string;
  name: string;
  shortName: string;
  address: string;
  city: string;
}

interface ApiMembership {
  userId: string;
  organizationId: string;
  role: string;
  title: string;
  organization: ApiOrganization;
  locations: ApiLocation[];
}

interface ApiUser {
  id: string;
  phone: string;
  name: string;
  createdAt: string;
  memberships: ApiMembership[];
}

/** Ответ login/register/otp-verify/password-reset. */
interface ApiAuthResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

// ---------------------------------------------------------------------------
// Мапперы
// ---------------------------------------------------------------------------

const KINDS: Record<string, OrganizationKind> = {
  wholesale: 'wholesale',
  retail: 'retail',
  logistics: 'logistics',
};

const ROLES: Record<string, Role> = {
  customer: 'customer',
  store_owner: 'store_owner',
  wholesale_seller: 'wholesale_seller',
  carrier: 'carrier',
};

/** Роль из API — SCREAMING_SNAKE_CASE — в мобильный camel_case. */
function roleFromApi(value: string): Role {
  return ROLES[value.toLowerCase()] ?? 'customer';
}

/** Тип организации из API — аналогично. */
function kindFromApi(value: string): OrganizationKind {
  return KINDS[value.toLowerCase()] ?? 'retail';
}

function toOrganization(api: ApiOrganization): Organization {
  return {
    id: api.id,
    name: api.name,
    shortName: api.shortName,
    kind: kindFromApi(api.kind),
  };
}

function toLocation(api: ApiLocation): BusinessLocation {
  return {
    id: api.id,
    organizationId: api.organizationId,
    name: api.name,
    shortName: api.shortName,
    address: api.address,
  };
}

function toMembership(api: ApiMembership): Membership {
  return {
    userId: api.userId,
    organizationId: api.organizationId,
    role: roleFromApi(api.role),
    title: api.title,
  };
}

/** «Снимок мира»: плоские списки организаций/точек из ответа /me. */
function toWorld(user: ApiUser): WorldSnapshot {
  const organizations: Organization[] = [];
  const locations: BusinessLocation[] = [];
  const seenOrg = new Set<string>();
  const seenLoc = new Set<string>();
  for (const apiMembership of user.memberships) {
    if (!seenOrg.has(apiMembership.organization.id)) {
      seenOrg.add(apiMembership.organization.id);
      organizations.push(toOrganization(apiMembership.organization));
    }
    for (const apiLocation of apiMembership.locations) {
      if (!seenLoc.has(apiLocation.id)) {
        seenLoc.add(apiLocation.id);
        locations.push(toLocation(apiLocation));
      }
    }
  }
  return {
    memberships: user.memberships.map(toMembership),
    organizations,
    locations,
  };
}

function toAuthUser(api: ApiUser): AuthUser {
  return {
    id: api.id,
    phone: api.phone,
    name: api.name,
    createdAt: api.createdAt,
    memberships: api.memberships.map(toMembership),
  };
}

// ---------------------------------------------------------------------------
// Публичный контракт authApi
// ---------------------------------------------------------------------------

/** Успешный аутентификационный результат: пользователь + токены + мир. */
export interface AuthResult extends Tokens {
  user: AuthUser;
  world: WorldSnapshot;
}

export interface RegisterData {
  phone: string;
  password: string;
  name: string;
}

export interface LoginData {
  phone: string;
  password: string;
}

export type OtpPurpose = 'login' | 'password_reset';

/** Сохраняет пару токенов: access — в память, refresh — в хранилище. */
async function persistTokens(tokens: Tokens): Promise<void> {
  setAccessToken(tokens.accessToken);
  await setRefreshToken(tokens.refreshToken);
}

function toResult(api: ApiAuthResponse): AuthResult {
  return {
    user: toAuthUser(api.user),
    accessToken: api.accessToken,
    refreshToken: api.refreshToken,
    world: toWorld(api.user),
  };
}

export const authApi = {
  /** Регистрация: POST /api/auth/register. */
  async register(data: RegisterData): Promise<AuthResult> {
    const api = await apiRequest<ApiAuthResponse>('/auth/register', {
      method: 'POST',
      body: data,
      auth: false,
    });
    await persistTokens(api);
    return toResult(api);
  },

  /** Вход по паролю: POST /api/auth/login. */
  async login(data: LoginData): Promise<AuthResult> {
    const api = await apiRequest<ApiAuthResponse>('/auth/login', {
      method: 'POST',
      body: data,
      auth: false,
    });
    await persistTokens(api);
    return toResult(api);
  },

  /** Вход по OTP: POST /api/auth/otp/verify. */
  async loginWithOtp(phone: string, code: string): Promise<AuthResult> {
    const api = await apiRequest<ApiAuthResponse>('/auth/otp/verify', {
      method: 'POST',
      body: { phone, code },
      auth: false,
    });
    await persistTokens(api);
    return toResult(api);
  },

  /**
   * Отправка OTP: POST /api/auth/otp/send. В dev-режиме сервер
   * возвращает код в ответе (devCode) — для подсказки на экране.
   */
  async sendOtp(
    phone: string,
    purpose: OtpPurpose = 'login',
  ): Promise<{ sent: boolean; devCode: string | null }> {
    const api = await apiRequest<{ sent: boolean; devCode?: string }>(
      '/auth/otp/send',
      {
        method: 'POST',
        body: { phone, purpose },
        auth: false,
      },
    );
    return { sent: api.sent, devCode: api.devCode ?? null };
  },

  /** Сброс пароля по коду: POST /api/auth/password/reset. */
  async resetPassword(
    phone: string,
    otp: string,
    newPassword: string,
  ): Promise<AuthResult> {
    const api = await apiRequest<ApiAuthResponse>('/auth/password/reset', {
      method: 'POST',
      body: { phone, code: otp, newPassword },
      auth: false,
    });
    await persistTokens(api);
    return toResult(api);
  },

  /** Профиль + мир: GET /api/auth/me. */
  async getSession(): Promise<AuthResult> {
    const api = await apiRequest<ApiUser>('/auth/me');
    // Токены уже в клиенте; в результате — для единообразия контракта.
    const refresh = await getRefreshToken();
    return {
      user: toAuthUser(api),
      accessToken: '',
      refreshToken: refresh ?? '',
      world: toWorld(api),
    };
  },

  /** Выход: POST /api/auth/logout (отзыв refresh-сессии). */
  async logout(): Promise<void> {
    const refresh = await getRefreshToken();
    if (!refresh) {
      return;
    }
    await apiRequest<{ ok?: boolean }>('/auth/logout', {
      method: 'POST',
      body: { refreshToken: refresh },
      auth: false,
    });
  },

  /** Живость API (health-check) для graceful degradation. */
  async ping(): Promise<boolean> {
    return pingApi();
  },
};
