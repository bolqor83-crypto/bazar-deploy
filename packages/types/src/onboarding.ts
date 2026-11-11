/**
 * Модель онбординга Bazar (см. ADR 0005).
 *
 * Онбординг проходит пользователь без членств (свежая регистрация
 * или вход по OTP новым номером): выбирает роль, при необходимости
 * создаёт организацию и точку. Шаги идут строго вперёд, состояние
 * персистится — после перезагрузки пользователь продолжает с того же
 * шага.
 *
 * Роль customer не требует организации: роль → сразу готово.
 */
import type { Role } from './context';

/** Шаги онбординга в порядке прохождения. */
export type OnboardingStep = 'role' | 'organization' | 'location' | 'done';

/** Данные для создания организации. */
export interface CreateOrganizationData {
  /** Название, например «Фермерский двор» (минимум 2 символа). */
  name: string;
  /** Тип организации — определяется выбранной ролью. */
  kind: 'wholesale' | 'retail' | 'logistics';
  /** Адрес (склад, офис): минимум 5 символов. */
  address: string;
}

/** Данные для создания торговой точки. */
export interface CreateLocationData {
  /** Название, например «Точка на Западном» (минимум 2 символа). */
  name: string;
  /** Адрес точки: минимум 5 символов. */
  address: string;
}

/**
 * Черновики и прогресс онбординга (состояние стора).
 * Персистится под ключом bazar.onboarding.state.
 */
export interface OnboardingState {
  /** Текущий шаг. */
  step: OnboardingStep;
  /** Выбранная роль; null — ещё не выбрана. */
  role: Role | null;
  /** Черновик формы организации (введённые значения сохраняются). */
  organizationDraft: CreateOrganizationData | null;
  /** Черновик формы точки. */
  locationDraft: CreateLocationData | null;
  /** Идентификаторы созданных сущностей (защита от повторного создания). */
  createdOrganizationId: string | null;
  createdLocationId: string | null;
}

/** Коды ошибок мок-сервиса онбординга. */
export type OnboardingErrorCode =
  | 'ONBOARDING_INVALID_NAME'
  | 'ONBOARDING_INVALID_ADDRESS'
  | 'ONBOARDING_UNKNOWN';

/** Ошибка мок-сервиса онбординга с машинным кодом. */
export class OnboardingError extends Error {
  readonly code: OnboardingErrorCode;

  constructor(code: OnboardingErrorCode, message: string) {
    super(message);
    this.name = 'OnboardingError';
    this.code = code;
  }
}
