/**
 * Мапперы записей Prisma в контракт API (Промт 7).
 *
 * Форма ответов согласована с мобильными типами @bazar/types:
 * User → AuthUser, Organization → { kind }, BusinessLocation →
 * { shortName }. Пароли и хеши сюда не попадают никогда.
 */
import type {
  BusinessLocation as DbLocation,
  Membership as DbMembership,
  Organization as DbOrganization,
  User as DbUser,
} from '@prisma/client';

/** Роль на сервере — SCREAMING_SNAKE_CASE. */
export type ApiRole =
  'CUSTOMER' | 'STORE_OWNER' | 'WHOLESALE_SELLER' | 'CARRIER';

/** Тип организации на сервере. */
export type ApiOrganizationType = 'WHOLESALE' | 'RETAIL' | 'LOGISTICS';

export const API_ROLES: readonly ApiRole[] = [
  'CUSTOMER',
  'STORE_OWNER',
  'WHOLESALE_SELLER',
  'CARRIER',
];

export const API_ORGANIZATION_TYPES: readonly ApiOrganizationType[] = [
  'WHOLESALE',
  'RETAIL',
  'LOGISTICS',
];

/** Должность по роли — вычисляется, в БД не хранится. */
const ROLE_TITLES: Record<ApiRole, string> = {
  CUSTOMER: 'Покупатель',
  STORE_OWNER: 'Владелец',
  WHOLESALE_SELLER: 'Менеджер оптовых продаж',
  CARRIER: 'Перевозчик',
};

export function isApiRole(value: string): value is ApiRole {
  return (API_ROLES as readonly string[]).includes(value);
}

export function isApiOrganizationType(
  value: string,
): value is ApiOrganizationType {
  return (API_ORGANIZATION_TYPES as readonly string[]).includes(value);
}

/**
 * Короткое название: «Сеть «У дома»» → «У дома»,
 * «Магазин «Ромашка»» → «Ромашка», «Ромашка — главный зал» →
 * «Главный зал». Названия точек («Точка на Садовой») остаются
 * целиком: склонение без морфологического анализатора не сделать,
 * а «Садовой» вместо «Садовая» в шапке хуже, чем полное название.
 * Поведение зафиксировано в ADR 0008.
 */
export function shortNameOf(name: string): string {
  let value = name.trim();
  for (const prefix of ['Сеть', 'Магазин']) {
    if (value.toLowerCase().startsWith(`${prefix.toLowerCase()} `)) {
      value = value.slice(prefix.length + 1);
      break;
    }
  }
  value = value.replace(/[«»"]/g, '').trim();
  const dash = value.indexOf(' — ');
  if (dash > 0) {
    value = value.slice(dash + 3);
    value = value.charAt(0).toUpperCase() + value.slice(1);
  }
  return value.length > 24 ? `${value.slice(0, 23)}…` : value;
}

export function toOrganizationResponse(org: DbOrganization): {
  id: string;
  name: string;
  shortName: string;
  kind: string;
  type: ApiOrganizationType;
  createdAt: string;
} {
  const type = isApiOrganizationType(org.type) ? org.type : 'RETAIL';
  return {
    id: org.id,
    name: org.name,
    shortName: shortNameOf(org.name),
    kind: type.toLowerCase(),
    type,
    createdAt: org.createdAt.toISOString(),
  };
}

export function toLocationResponse(loc: DbLocation): {
  id: string;
  organizationId: string;
  name: string;
  shortName: string;
  address: string;
  city: string;
  createdAt: string;
} {
  return {
    id: loc.id,
    organizationId: loc.organizationId,
    name: loc.name,
    shortName: shortNameOf(loc.name),
    address: loc.address,
    city: loc.city,
    createdAt: loc.createdAt.toISOString(),
  };
}

/** Членство с развёрнутой организацией (для /auth/me и /users/me). */
export function toMembershipResponse(
  membership: DbMembership & {
    organization: DbOrganization;
  },
  locations: DbLocation[],
): {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  title: string;
  organization: ReturnType<typeof toOrganizationResponse>;
  locations: ReturnType<typeof toLocationResponse>[];
} {
  const role = isApiRole(membership.role) ? membership.role : 'CUSTOMER';
  return {
    id: membership.id,
    userId: membership.userId,
    organizationId: membership.organizationId,
    role: role.toLowerCase(),
    title: ROLE_TITLES[role],
    organization: toOrganizationResponse(membership.organization),
    locations: locations.map(toLocationResponse),
  };
}

export function toUserResponse(
  user: DbUser & {
    memberships: (DbMembership & { organization: DbOrganization })[];
  },
  locationsByOrg: Map<string, DbLocation[]>,
): {
  id: string;
  phone: string;
  name: string;
  createdAt: string;
  memberships: ReturnType<typeof toMembershipResponse>[];
} {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    memberships: user.memberships.map((m) =>
      toMembershipResponse(m, locationsByOrg.get(m.organizationId) ?? []),
    ),
  };
}
