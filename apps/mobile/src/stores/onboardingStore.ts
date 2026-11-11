/**
 * Стор онбординга Bazar (Промт 6, Часть B; модель — ADR 0005).
 *
 * Прогресс (шаг, роль, черновики форм, идентификаторы созданных
 * сущностей) персистится в AsyncStorage под ключом
 * bazar.onboarding.state — после перезагрузки пользователь
 * продолжает с того же шага, введённые значения не теряются.
 *
 * Поток шагов: role → organization → (store_owner) location → done.
 * customer переходит к done сразу после выбора роли.
 *
 * Действия не бросают исключений наружу: ошибки мок-сервиса
 * переводятся в русский текст в state.error.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type {
  CreateLocationData,
  CreateOrganizationData,
  OnboardingErrorCode,
  OnboardingStep,
  Role,
} from '@bazar/types';
import { OnboardingError } from '@bazar/types';
import { onboardingMockService } from '../services/onboardingMock';
import { useAuthStore } from './authStore';
import { useContextStore } from './contextStore';

export const ONBOARDING_STATE_KEY = 'bazar.onboarding.state';

/** Тип организации для бизнес-роли (customer организации не создаёт). */
const ORG_KIND_FOR_ROLE: Record<
  Exclude<Role, 'customer'>,
  CreateOrganizationData['kind']
> = {
  store_owner: 'retail',
  wholesale_seller: 'wholesale',
  carrier: 'logistics',
};

/** Человекочитаемые тексты ошибок по кодам мок-сервиса. */
const ERROR_MESSAGES: Record<OnboardingErrorCode, string> = {
  ONBOARDING_INVALID_NAME: 'Введите название — минимум 2 символа',
  ONBOARDING_INVALID_ADDRESS: 'Введите адрес — минимум 5 символов',
  ONBOARDING_UNKNOWN: 'Что-то пошло не так. Попробуйте ещё раз',
};

function messageFor(error: unknown): string {
  if (error instanceof OnboardingError) {
    return ERROR_MESSAGES[error.code] ?? ERROR_MESSAGES.ONBOARDING_UNKNOWN;
  }
  return ERROR_MESSAGES.ONBOARDING_UNKNOWN;
}

/** Персистируемая часть состояния. */
export interface OnboardingProgress {
  step: OnboardingStep;
  role: Role | null;
  organizationDraft: CreateOrganizationData | null;
  locationDraft: CreateLocationData | null;
  createdOrganizationId: string | null;
  createdLocationId: string | null;
}

export interface OnboardingStoreState extends OnboardingProgress {
  hydrated: boolean;
  submitting: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  /** Начало онбординга с экрана приветствия: шаг выбора роли. */
  start: () => void;
  /** Выбор роли: customer → done, остальные → organization. */
  setRole: (role: Role) => void;
  /** Создание организации; store_owner затем создаёт точку. */
  submitOrganization: (data: CreateOrganizationData) => Promise<boolean>;
  /** Создание точки (только store_owner). */
  submitLocation: (data: CreateLocationData) => Promise<boolean>;
  /**
   * Завершение: создаёт членство, обновляет пользователя и контекст
   * (authStore.refreshUser → contextStore.syncWithUser + setRole).
   * Возвращает true, когда можно переходить в /(tabs).
   */
  finish: () => Promise<boolean>;
  reset: () => void;
  clearError: () => void;
}

const INITIAL_PROGRESS: OnboardingProgress = {
  step: 'role',
  role: null,
  organizationDraft: null,
  locationDraft: null,
  createdOrganizationId: null,
  createdLocationId: null,
};

function isStep(value: unknown): value is OnboardingStep {
  return (
    value === 'role' ||
    value === 'organization' ||
    value === 'location' ||
    value === 'done'
  );
}

function isRole(value: unknown): value is Role {
  return (
    value === 'customer' ||
    value === 'store_owner' ||
    value === 'wholesale_seller' ||
    value === 'carrier'
  );
}

/** Запись прогресса в хранилище; ошибки молча поглощаются. */
async function persistProgress(progress: OnboardingProgress): Promise<void> {
  if (typeof window === 'undefined') {
    // SSR (статический экспорт): хранилища нет.
    return;
  }
  try {
    await AsyncStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(progress));
  } catch {
    // Прогресс не сохранился — онбординг продолжается в памяти.
  }
}

export const useOnboardingStore = create<OnboardingStoreState>()(
  (set, get) => ({
    ...INITIAL_PROGRESS,
    hydrated: false,
    submitting: false,
    error: null,

    hydrate: async () => {
      if (typeof window === 'undefined') {
        set({ hydrated: true });
        return;
      }
      let restored: Partial<OnboardingProgress> = {};
      try {
        const raw = await AsyncStorage.getItem(ONBOARDING_STATE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<OnboardingProgress>;
          if (isStep(parsed.step)) {
            restored = {
              step: parsed.step,
              role: isRole(parsed.role) ? parsed.role : null,
              organizationDraft: parsed.organizationDraft ?? null,
              locationDraft: parsed.locationDraft ?? null,
              createdOrganizationId: parsed.createdOrganizationId ?? null,
              createdLocationId: parsed.createdLocationId ?? null,
            };
          }
        }
      } catch {
        // Повреждённая запись — начинаем с первого шага.
        restored = {};
      }
      set({ ...INITIAL_PROGRESS, ...restored, hydrated: true });
    },

    start: () => {
      set({ step: 'role', error: null });
      void persistProgress(progressOf(get()));
    },

    setRole: (role) => {
      // customer не создаёт организацию — сразу готово.
      const step: OnboardingStep =
        role === 'customer' ? 'done' : 'organization';
      set({ role, step, error: null });
      void persistProgress(progressOf(get()));
    },

    submitOrganization: async (data) => {
      const { role, createdOrganizationId } = get();
      if (role === null || role === 'customer') {
        // Организацию создают только бизнес-роли.
        set({ error: 'Сначала выберите роль' });
        return false;
      }

      // Возобновление после перезагрузки: организация уже создана,
      // повторно не создаём — только черновик и шаг.
      if (createdOrganizationId) {
        const step: OnboardingStep =
          role === 'store_owner' ? 'location' : 'done';
        set({ organizationDraft: data, step, error: null });
        void persistProgress(progressOf(get()));
        return true;
      }

      const user = useAuthStore.getState().user;
      if (!user) {
        set({ error: 'Сессия истекла. Войдите заново' });
        return false;
      }

      set({ submitting: true, error: null });
      try {
        const organization = await onboardingMockService.createOrganization(
          user.id,
          { ...data, kind: ORG_KIND_FOR_ROLE[role] },
        );
        // Организация сразу видна приложению (шапка, шит контекста).
        useContextStore.getState().registerOrganizations([organization]);
        const step: OnboardingStep =
          role === 'store_owner' ? 'location' : 'done';
        set({
          createdOrganizationId: organization.id,
          organizationDraft: data,
          step,
          submitting: false,
          error: null,
        });
        void persistProgress(progressOf(get()));
        return true;
      } catch (error) {
        set({ submitting: false, error: messageFor(error) });
        return false;
      }
    },

    submitLocation: async (data) => {
      const { role, createdOrganizationId, createdLocationId } = get();
      if (role !== 'store_owner' || !createdOrganizationId) {
        set({ error: 'Сначала создайте организацию' });
        return false;
      }

      // Возобновление: точка уже создана.
      if (createdLocationId) {
        set({ locationDraft: data, step: 'done', error: null });
        void persistProgress(progressOf(get()));
        return true;
      }

      const user = useAuthStore.getState().user;
      if (!user) {
        set({ error: 'Сессия истекла. Войдите заново' });
        return false;
      }

      set({ submitting: true, error: null });
      try {
        const location = await onboardingMockService.createLocation(
          user.id,
          createdOrganizationId,
          data,
        );
        useContextStore.getState().registerLocations([location]);
        set({
          createdLocationId: location.id,
          locationDraft: data,
          step: 'done',
          submitting: false,
          error: null,
        });
        void persistProgress(progressOf(get()));
        return true;
      } catch (error) {
        set({ submitting: false, error: messageFor(error) });
        return false;
      }
    },

    finish: async () => {
      const { role, createdOrganizationId, createdLocationId } = get();
      const auth = useAuthStore.getState();
      const user = auth.user;
      if (auth.state !== 'authenticated' || !user) {
        set({ error: 'Сессия истекла. Войдите заново' });
        return false;
      }
      if (role === null) {
        set({ error: 'Сначала выберите роль' });
        return false;
      }

      set({ submitting: true, error: null });
      try {
        if (role !== 'customer') {
          if (!createdOrganizationId) {
            set({
              submitting: false,
              error: 'Сначала создайте организацию',
            });
            return false;
          }
          // Членство появляется только при завершении: брошенный
          // на полпути онбординг можно возобновить (OnboardingGuard
          // пускает пользователя без членств).
          await onboardingMockService.addMembership(
            user.id,
            createdOrganizationId,
            role,
          );
          // Свежие членства в authStore + contextStore.
          await auth.refreshUser();
          // Контекст под выбранную роль (организация доберётся
          // нормализацией по членствам).
          useContextStore.getState().setRole(role);
          if (role === 'store_owner' && createdLocationId) {
            useContextStore.getState().setLocation(createdLocationId);
          }
        } else {
          // Покупатель: контекст уже customer, организация не нужна.
          useContextStore.getState().setRole('customer');
        }
        set({ step: 'done', submitting: false, error: null });
        void persistProgress(progressOf(get()));
        return true;
      } catch (error) {
        set({ submitting: false, error: messageFor(error) });
        return false;
      }
    },

    reset: () => {
      set({ ...INITIAL_PROGRESS, submitting: false, error: null });
      if (typeof window !== 'undefined') {
        void AsyncStorage.removeItem(ONBOARDING_STATE_KEY).catch(
          () => undefined,
        );
      }
    },

    clearError: () => {
      set({ error: null });
    },
  }),
);

/** Прогресс без служебных полей — для персиста. */
function progressOf(state: OnboardingStoreState): OnboardingProgress {
  return {
    step: state.step,
    role: state.role,
    organizationDraft: state.organizationDraft,
    locationDraft: state.locationDraft,
    createdOrganizationId: state.createdOrganizationId,
    createdLocationId: state.createdLocationId,
  };
}

/** Только для тестов: сброс к исходному состоянию. */
export function __resetOnboardingStoreForTests(): void {
  useOnboardingStore.setState({
    ...INITIAL_PROGRESS,
    hydrated: true,
    submitting: false,
    error: null,
  });
}
