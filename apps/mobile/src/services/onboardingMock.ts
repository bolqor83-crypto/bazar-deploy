/**
 * Мок-бэкенд онбординга Bazar.
 *
 * // MOCK ONLY. Реальный бэкенд организаций — Промт 8.
 *
 * Созданные в онбординге организации, точки и членства хранятся в
 * AsyncStorage отдельно (bazar.onboarding.*). С Промта 7
 * аутентификация — реальный API: listForUser() отдаёт локальные
 * онбординг-данные пользователя, authStore подмешивает их к
 * данным API в «снимок мира» contextStore (переезд — Промт 8).
 *
 * Каждая операция имитирует задержку сети (300–700 мс) только в
 * браузере; на SSR и в тестах (node-окружение без window) — без
 * задержки. Паролей и секретов здесь нет: сущности публичные.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  OnboardingError,
  type BusinessLocation,
  type Membership,
  type Organization,
  type Role,
} from '@bazar/types';
import {
  mockLocations,
  mockMemberships,
  mockOrganizations,
} from '../mocks/context';

// ---------------------------------------------------------------------------
// Ключи хранилища
// ---------------------------------------------------------------------------

export const ONBOARDING_ORGS_KEY = 'bazar.onboarding.organizations';
export const ONBOARDING_LOCATIONS_KEY = 'bazar.onboarding.locations';
export const ONBOARDING_MEMBERSHIPS_KEY = 'bazar.onboarding.memberships';

// ---------------------------------------------------------------------------
// Внутренние типы записей
// ---------------------------------------------------------------------------

/** Запись организации, созданной в онбординге. */
export interface StoredOnboardingOrganization extends Organization {
  address: string;
  createdBy: string;
  createdAt: string;
}

/** Запись точки, созданной в онбординге. */
export interface StoredOnboardingLocation extends BusinessLocation {
  createdBy: string;
  createdAt: string;
}

/** Запись членства, созданного в онбординге. */
export interface StoredOnboardingMembership extends Membership {
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Вспомогательные функции
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Задержка сети: только в браузере, имитация 300–700 мс. */
async function imitateNetwork(): Promise<void> {
  if (typeof window === 'undefined') {
    // SSR и тесты: не блокируем.
    return;
  }
  await delay(300 + Math.random() * 400);
}

function fail(
  code:
    | 'ONBOARDING_INVALID_NAME'
    | 'ONBOARDING_INVALID_ADDRESS'
    | 'ONBOARDING_UNKNOWN',
  message: string,
): never {
  throw new OnboardingError(code, message);
}

/** Название валидно: непустое, минимум 2 символа. */
function isValidName(name: string): boolean {
  return typeof name === 'string' && name.trim().length >= 2;
}

/** Адрес валиден: минимум 5 символов. */
function isValidAddress(address: string): boolean {
  return typeof address === 'string' && address.trim().length >= 5;
}

async function readJson<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJson<T>(key: string, value: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** Короткое название для шапки: первые два слова полного названия. */
function shortNameOf(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length <= 2 ? name.trim() : words.slice(0, 2).join(' ');
}

// ---------------------------------------------------------------------------
// Сервис
// ---------------------------------------------------------------------------

export const onboardingMockService = {
  /**
   * Создаёт организацию пользователя.
   * // MOCK ONLY. Реальный бэкенд — Промт 8.
   */
  async createOrganization(
    userId: string,
    data: {
      name: string;
      kind: 'wholesale' | 'retail' | 'logistics';
      address: string;
    },
  ): Promise<Organization> {
    await imitateNetwork();

    if (!isValidName(data.name)) {
      fail('ONBOARDING_INVALID_NAME', 'Название: минимум 2 символа');
    }
    if (!isValidAddress(data.address)) {
      fail('ONBOARDING_INVALID_ADDRESS', 'Адрес: минимум 5 символов');
    }

    const organization: StoredOnboardingOrganization = {
      id: `ob-org-${Crypto.randomUUID()}`,
      name: data.name.trim(),
      shortName: shortNameOf(data.name),
      kind: data.kind,
      address: data.address.trim(),
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    const stored =
      await readJson<StoredOnboardingOrganization>(ONBOARDING_ORGS_KEY);
    stored.push(organization);
    await writeJson(ONBOARDING_ORGS_KEY, stored);
    return organization;
  },

  /**
   * Создаёт торговую точку организации.
   * // MOCK ONLY. Реальный бэкенд — Промт 8.
   */
  async createLocation(
    userId: string,
    organizationId: string,
    data: { name: string; address: string },
  ): Promise<BusinessLocation> {
    await imitateNetwork();

    if (!isValidName(data.name)) {
      fail('ONBOARDING_INVALID_NAME', 'Название: минимум 2 символа');
    }
    if (!isValidAddress(data.address)) {
      fail('ONBOARDING_INVALID_ADDRESS', 'Адрес: минимум 5 символов');
    }

    const location: StoredOnboardingLocation = {
      id: `ob-loc-${Crypto.randomUUID()}`,
      organizationId,
      name: data.name.trim(),
      shortName: shortNameOf(data.name),
      address: data.address.trim(),
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };

    const stored = await readJson<StoredOnboardingLocation>(
      ONBOARDING_LOCATIONS_KEY,
    );
    stored.push(location);
    await writeJson(ONBOARDING_LOCATIONS_KEY, stored);
    return location;
  },

  /**
   * Привязывает пользователя к организации с ролью. Идемпотентно:
   * повторный вызов с теми же userId/organizationId/role не создаёт
   * дубль.
   * // MOCK ONLY. Реальный бэкенд — Промт 8.
   */
  async addMembership(
    userId: string,
    organizationId: string,
    role: Role,
    title: string = 'Владелец',
  ): Promise<Membership> {
    await imitateNetwork();

    if (!isValidName(userId) || !isValidName(organizationId)) {
      fail('ONBOARDING_UNKNOWN', 'Некорректные данные членства');
    }

    const membership: StoredOnboardingMembership = {
      userId,
      organizationId,
      role,
      title,
      createdAt: new Date().toISOString(),
    };

    const stored = await readJson<StoredOnboardingMembership>(
      ONBOARDING_MEMBERSHIPS_KEY,
    );
    const exists = stored.some(
      (m) =>
        m.userId === userId &&
        m.organizationId === organizationId &&
        m.role === role,
    );
    if (!exists) {
      stored.push(membership);
      await writeJson(ONBOARDING_MEMBERSHIPS_KEY, stored);
    }

    return membership;
  },

  /**
   * Все организации: моки Промта 3 + созданные в онбординге.
   * // MOCK ONLY. Реальный бэкенд — Промт 8.
   */
  async getAllOrganizations(): Promise<Organization[]> {
    const created =
      await readJson<StoredOnboardingOrganization>(ONBOARDING_ORGS_KEY);
    return [...mockOrganizations, ...created];
  },

  /**
   * Все точки: моки Промта 3 + созданные в онбординге.
   * // MOCK ONLY. Реальный бэкенд — Промт 8.
   */
  async getAllLocations(): Promise<BusinessLocation[]> {
    const created = await readJson<StoredOnboardingLocation>(
      ONBOARDING_LOCATIONS_KEY,
    );
    return [...mockLocations, ...created];
  },

  /**
   * Все членства: моки Промта 3 + созданные в онбординге.
   * // MOCK ONLY. Реальный бэкенд — Промт 8.
   */
  async getAllMemberships(): Promise<Membership[]> {
    const created = await readJson<StoredOnboardingMembership>(
      ONBOARDING_MEMBERSHIPS_KEY,
    );
    return [...mockMemberships, ...created];
  },

  /**
   * Локальный «мир» пользователя, созданный в онбординге:
   * организации, точки и членства. Без моков Промта 3 — членства
   * пользователя приходят из реального API (Промт 7), локальные
   * онбординг-данные подмешиваются поверх (до Промта 8).
   * // MOCK ONLY. Реальный бэкенд — Промт 8.
   */
  async listForUser(userId: string): Promise<{
    organizations: Organization[];
    locations: BusinessLocation[];
    memberships: Membership[];
  }> {
    const [orgs, locs, memberships] = await Promise.all([
      readJson<StoredOnboardingOrganization>(ONBOARDING_ORGS_KEY),
      readJson<StoredOnboardingLocation>(ONBOARDING_LOCATIONS_KEY),
      readJson<StoredOnboardingMembership>(ONBOARDING_MEMBERSHIPS_KEY),
    ]);
    const userOrgs = orgs.filter((o) => o.createdBy === userId);
    const userOrgIds = new Set(userOrgs.map((o) => o.id));
    return {
      organizations: userOrgs,
      locations: locs.filter(
        (l) => l.createdBy === userId || userOrgIds.has(l.organizationId),
      ),
      memberships: memberships.filter((m) => m.userId === userId),
    };
  },
};

/** Только для тестов: полная очистка хранилища онбординга. */
export async function __clearOnboardingStorageForTests(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_ORGS_KEY);
  await AsyncStorage.removeItem(ONBOARDING_LOCATIONS_KEY);
  await AsyncStorage.removeItem(ONBOARDING_MEMBERSHIPS_KEY);
}
