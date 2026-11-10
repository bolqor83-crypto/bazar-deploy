/**
 * Утилиты отображения контекста: подписи для шапки и шита выбора.
 */
import type { ActiveContext, BusinessLocation, Membership, Organization, Role } from '@bazar/types';
import { mockLocations, mockOrganizations } from '../../mocks/context';
import { ROLE_LABEL } from './navigation';

/** Организация по идентификатору (пока из моков). */
export function findOrganization(id: string | null): Organization | undefined {
  if (!id) return undefined;
  return mockOrganizations.find((o) => o.id === id);
}

/** Точка по идентификатору (пока из моков). */
export function findLocation(id: string | null): BusinessLocation | undefined {
  if (!id) return undefined;
  return mockLocations.find((l) => l.id === id);
}

/** Организации, доступные пользователю в данной роли. */
export function organizationsForRole(role: Role, memberships: Membership[]): Organization[] {
  const ids = memberships.filter((m) => m.role === role).map((m) => m.organizationId);
  return mockOrganizations.filter((o) => ids.includes(o.id));
}

/** Точки организации (пока из моков). */
export function locationsForOrganization(organizationId: string | null): BusinessLocation[] {
  if (!organizationId) return [];
  return mockLocations.filter((l) => l.organizationId === organizationId);
}

/**
 * Подпись активного контекста для шапки:
 * «Опт-Юг», «У дома · Садовая», «Покупатель», «Перевозчик».
 */
export function formatContextLabel(
  active: ActiveContext,
  memberships: Membership[]
): string {
  void memberships;
  if (active.role === 'customer') {
    return ROLE_LABEL.customer;
  }
  const org = findOrganization(active.organizationId);
  if (!org) {
    return ROLE_LABEL[active.role];
  }
  if (active.role === 'store_owner') {
    const loc = findLocation(active.locationId);
    return loc ? `${org.shortName} · ${loc.shortName}` : org.shortName;
  }
  return org.shortName;
}
