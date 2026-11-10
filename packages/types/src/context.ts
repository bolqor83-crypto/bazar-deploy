/**
 * Модель контекста приложения Bazar (см. ADR 0003).
 *
 * Уровни не склеиваются:
 *   User → Organization → Membership → BusinessLocation → Role
 *
 * - User — аккаунт для входа. Один на устройство/сессию.
 * - Organization — бизнес-субъект (опт, розница, логистика). Может быть несколько.
 * - Membership — связь пользователя с организацией + роль в ней.
 * - BusinessLocation — торговая точка внутри розничной организации.
 * - Role — одна из четырёх ролей продукта.
 */

/** Роль пользователя в активном контексте. */
export type Role = 'customer' | 'store_owner' | 'wholesale_seller' | 'carrier';

/** Тип организации. */
export type OrganizationKind = 'wholesale' | 'retail' | 'logistics';

/** Пользователь — аккаунт для входа. */
export interface User {
  id: string;
  fullName: string;
  /** Инициалы для аватара, например «ИП». */
  initials: string;
}

/** Бизнес-субъект. */
export interface Organization {
  id: string;
  /** Полное название, например «Сеть «У дома»». */
  name: string;
  /** Короткое название для шапки, например «У дома». */
  shortName: string;
  kind: OrganizationKind;
}

/** Торговая точка розничной организации. */
export interface BusinessLocation {
  id: string;
  organizationId: string;
  /** Полное название, например «Точка на Садовой». */
  name: string;
  /** Короткое название для шапки, например «Садовая». */
  shortName: string;
  address: string;
}

/** Членство пользователя в организации с ролью. */
export interface Membership {
  userId: string;
  organizationId: string;
  role: Role;
  /** Должность/статус в организации, например «Владелец». */
  title: string;
}

/**
 * Активный контекст — то, чем пользователь оперирует прямо сейчас.
 * Определяет tab bar, доступные экраны, заголовок и данные.
 */
export interface ActiveContext {
  userId: string;
  role: Role;
  /** null для customer; обязателен для store_owner и wholesale_seller. */
  organizationId: string | null;
  /** Только для store_owner; null означает «вся сеть». */
  locationId: string | null;
}
