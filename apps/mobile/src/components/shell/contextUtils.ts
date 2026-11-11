/**
 * Утилиты отображения контекста: подписи для шапки и шита выбора.
 *
 * Организации и точки по умолчанию — моки Промта 3; компоненты,
 * которым нужны созданные в онбординге сущности, передают списки
 * из contextStore (organizations/locations).
 */
import type {
  ActiveContext,
  BusinessLocation,
  Membership,
  Organization,
  Role,
} from '@bazar/types';
import { mockLocations, mockOrganizations } from '../../mocks/context';
import { ROLE_LABEL } from './navigation';

/** Организация по идентификатору. */
export function findOrganization(
  id: string | null,
  organizations: Organization[] = mockOrganizations,
): Organization | undefined {
  if (!id) return undefined;
  return organizations.find((o) => o.id === id);
}

/** Точка по идентификатору. */
export function findLocation(
  id: string | null,
  locations: BusinessLocation[] = mockLocations,
): BusinessLocation | undefined {
  if (!id) return undefined;
  return locations.find((l) => l.id === id);
}

/** Организации, доступные пользователю в данной роли. */
export function organizationsForRole(
  role: Role,
  memberships: Membership[],
  organizations: Organization[] = mockOrganizations,
): Organization[] {
  const ids = memberships
    .filter((m) => m.role === role)
    .map((m) => m.organizationId);
  return organizations.filter((o) => ids.includes(o.id));
}

/** Точки организации. */
export function locationsForOrganization(
  organizationId: string | null,
  locations: BusinessLocation[] = mockLocations,
): BusinessLocation[] {
  if (!organizationId) return [];
  return locations.filter((l) => l.organizationId === organizationId);
}

/**
 * Подпись активного контекста для шапки:
 * «Опт-Юг», «У дома · Садовая», «Покупатель», «Перевозчик».
 */
export function formatContextLabel(
  active: ActiveContext,
  memberships: Membership[],
  organizations: Organization[] = mockOrganizations,
  locations: BusinessLocation[] = mockLocations,
): string {
  void memberships;
  if (active.role === 'customer') {
    return ROLE_LABEL.customer;
  }
  const org = findOrganization(active.organizationId, organizations);
  if (!org) {
    return ROLE_LABEL[active.role];
  }
  if (active.role === 'store_owner') {
    const loc = findLocation(active.locationId, locations);
    return loc ? `${org.shortName} · ${loc.shortName}` : org.shortName;
  }
  return org.shortName;
}
