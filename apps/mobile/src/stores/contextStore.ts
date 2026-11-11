/**
 * Стор активного контекста Bazar.
 *
 * Активный контекст (роль + организация + точка) персистится в
 * AsyncStorage под ключом bazar.context.active. Членства пока
 * берутся из моков; с API они придут с сервера и не персистятся.
 *
 * При гидратации невалидный контекст (роль исчезла, организация
 * недоступна) откатывается на покупателя (customer).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import type { ActiveContext, Membership, Role } from '@bazar/types';
import {
  customerContext,
  mockLocations,
  mockMemberships,
} from '../mocks/context';

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

export const CONTEXT_STORAGE_KEY = 'bazar.context.active';

function isRole(value: unknown): value is Role {
  return (
    value === 'customer' ||
    value === 'store_owner' ||
    value === 'wholesale_seller' ||
    value === 'carrier'
  );
}

/** Идентификаторы точек организации (пока из моков). */
function locationIdsOf(organizationId: string): string[] {
  return mockLocations
    .filter((l) => l.organizationId === organizationId)
    .map((l) => l.id);
}

function orgBelongsToRole(
  orgId: string,
  role: Role,
  memberships: Membership[],
): boolean {
  return memberships.some((m) => m.role === role && m.organizationId === orgId);
}

/**
 * Валидация контекста по членствам.
 * Возвращает нормализованный контекст или null, если контекст
 * невалиден (роль недоступна пользователю и т.п.).
 */
export function validateContext(
  ctx: ActiveContext | null | undefined,
  memberships: Membership[],
): ActiveContext | null {
  if (!ctx || typeof ctx !== 'object') {
    return null;
  }
  const { userId, role, organizationId, locationId } = ctx;

  if (typeof userId !== 'string' || !isRole(role)) {
    return null;
  }

  switch (role) {
    case 'customer':
      // Покупатель — без организации и точки.
      return {
        userId,
        role: 'customer',
        organizationId: null,
        locationId: null,
      };

    case 'store_owner': {
      if (
        !organizationId ||
        !orgBelongsToRole(organizationId, 'store_owner', memberships)
      ) {
        return null;
      }
      const validLocation =
        locationId && locationIdsOf(organizationId).includes(locationId)
          ? locationId
          : null;
      return {
        userId,
        role: 'store_owner',
        organizationId,
        locationId: validLocation,
      };
    }

    case 'wholesale_seller': {
      if (
        !organizationId ||
        !orgBelongsToRole(organizationId, 'wholesale_seller', memberships)
      ) {
        return null;
      }
      return {
        userId,
        role: 'wholesale_seller',
        organizationId,
        locationId: null,
      };
    }

    case 'carrier': {
      // Роль должна быть в членствах; организация опциональна.
      const hasCarrierMembership = memberships.some(
        (m) => m.role === 'carrier',
      );
      if (!hasCarrierMembership) {
        return null;
      }
      const org =
        organizationId &&
        orgBelongsToRole(organizationId, 'carrier', memberships)
          ? organizationId
          : null;
      return { userId, role: 'carrier', organizationId: org, locationId: null };
    }
  }
}

/**
 * Нормализация контекста под роль: добирает первую подходящую
 * организацию, чистит точку, где она не применима.
 */
export function normalizeForRole(
  ctx: ActiveContext,
  memberships: Membership[],
): ActiveContext {
  const firstOrgIdOf = (role: Role): string | null =>
    memberships.find((m) => m.role === role)?.organizationId ?? null;

  switch (ctx.role) {
    case 'customer':
      return {
        userId: ctx.userId,
        role: 'customer',
        organizationId: null,
        locationId: null,
      };

    case 'store_owner': {
      const orgId =
        ctx.organizationId &&
        orgBelongsToRole(ctx.organizationId, 'store_owner', memberships)
          ? ctx.organizationId
          : firstOrgIdOf('store_owner');
      // Организация сменилась — точка прежней организации не применима.
      const orgChanged = orgId !== ctx.organizationId;
      const locationId =
        !orgChanged &&
        orgId &&
        ctx.locationId &&
        locationIdsOf(orgId).includes(ctx.locationId)
          ? ctx.locationId
          : null;
      return {
        userId: ctx.userId,
        role: 'store_owner',
        organizationId: orgId,
        locationId,
      };
    }

    case 'wholesale_seller': {
      const orgId =
        ctx.organizationId &&
        orgBelongsToRole(ctx.organizationId, 'wholesale_seller', memberships)
          ? ctx.organizationId
          : firstOrgIdOf('wholesale_seller');
      return {
        userId: ctx.userId,
        role: 'wholesale_seller',
        organizationId: orgId,
        locationId: null,
      };
    }

    case 'carrier': {
      // Организация опциональна: если указана чужая — работаем без неё.
      const orgId =
        ctx.organizationId &&
        orgBelongsToRole(ctx.organizationId, 'carrier', memberships)
          ? ctx.organizationId
          : null;
      return {
        userId: ctx.userId,
        role: 'carrier',
        organizationId: orgId,
        locationId: null,
      };
    }
  }
}

/** Приоритет ролей при автоподборе контекста после входа. */
const ROLE_PRIORITY: Role[] = [
  'wholesale_seller',
  'store_owner',
  'carrier',
  'customer',
];

/**
 * Первый контекст пользователя по приоритету членств:
 * wholesale → store_owner → carrier → customer.
 */
export function contextByPriority(
  userId: string,
  memberships: Membership[],
): ActiveContext {
  const role =
    ROLE_PRIORITY.find((r) => memberships.some((m) => m.role === r)) ??
    'customer';
  const organizationId =
    memberships.find((m) => m.role === role)?.organizationId ?? null;
  // Для carrier организация опциональна, для customer — null.
  const ctx: ActiveContext = {
    userId,
    role,
    organizationId: role === 'customer' ? null : organizationId,
    locationId: null,
  };
  return normalizeForRole(ctx, memberships);
}

export interface ContextState {
  active: ActiveContext;
  memberships: Membership[];
  /** Гидратация из AsyncStorage завершена. */
  hydrated: boolean;
  setActive: (ctx: ActiveContext) => void;
  setRole: (role: Role) => void;
  setOrganization: (orgId: string) => void;
  setLocation: (locId: string | null) => void;
  /**
   * Синхронизация с пользователем после входа/гидратации сессии:
   * обновляет членства и пересобирает контекст (по приоритету,
   * если пользователь сменился).
   */
  syncWithUser: (userId: string, memberships: Membership[]) => void;
  /** Сброс при выходе: customer-контекст без пользователя, чистое хранилище. */
  reset: () => void;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set, get) => ({
      active: { ...customerContext },
      memberships: mockMemberships,
      hydrated: false,

      setActive: (ctx) => {
        const validated = validateContext(ctx, get().memberships);
        set({ active: validated ?? { ...customerContext } });
      },

      setRole: (role) => {
        const { active, memberships } = get();
        set({ active: normalizeForRole({ ...active, role }, memberships) });
      },

      setOrganization: (orgId) => {
        const { active, memberships } = get();
        set({
          active: normalizeForRole(
            { ...active, organizationId: orgId },
            memberships,
          ),
        });
      },

      setLocation: (locId) => {
        const { active } = get();
        if (active.role !== 'store_owner') {
          return;
        }
        set({ active: { ...active, locationId: locId } });
      },

      syncWithUser: (userId, memberships) => {
        const { active } = get();
        // Гостевой контекст (userId === '') — это не «тот же
        // пользователь»: при входе приоритет членств применяется
        // всегда, иначе первый вход уводил бы в customer.
        const sameUser = active.userId !== '' && active.userId === userId;
        if (sameUser) {
          // Тот же пользователь: сохраняем выбранный контекст, если он
          // ещё валиден по свежим членствам, иначе пересобираем.
          const normalized = normalizeForRole(active, memberships);
          const valid = validateContext(normalized, memberships);
          set({
            memberships,
            active: valid ?? contextByPriority(userId, memberships),
          });
          return;
        }
        // Другой пользователь: контекст выбираем заново по приоритету.
        set({ memberships, active: contextByPriority(userId, memberships) });
      },

      reset: () => {
        // Выход: без пользователя, роль customer, без организаций.
        set({
          memberships: [],
          hydrated: true,
          active: {
            userId: '',
            role: 'customer',
            organizationId: null,
            locationId: null,
          },
        });
        // persist-прослойка перепишет ключ после set — удаляем её запись
        // строго после (очередь AsyncStorage FIFO: removeItem выполняется
        // последним, ключ исчезает).
        void getSafeStorage().removeItem(CONTEXT_STORAGE_KEY);
      },
    }),
    {
      name: CONTEXT_STORAGE_KEY,
      storage: createJSONStorage(getSafeStorage),
      partialize: (state) => ({ active: state.active }),
      onRehydrateStorage: () => (state) => {
        const validated = validateContext(
          state?.active,
          state?.memberships ?? mockMemberships,
        );
        useContextStore.setState({
          active: validated ?? { ...customerContext },
          hydrated: true,
        });
      },
    },
  ),
);
