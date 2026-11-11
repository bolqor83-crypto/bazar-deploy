/**
 * Сервис членств: мост User ↔ Organization (Промт 7).
 *
 * Список членств с развёрнутыми организациями и точками — основа
 * ответа GET /api/organizations и /api/users/me.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toMembershipResponse } from '../common/mappers';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Членства пользователя с организациями и их точками. */
  async listForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    const locations = orgIds.length
      ? await this.prisma.businessLocation.findMany({
          where: { organizationId: { in: orgIds } },
          orderBy: { createdAt: 'asc' },
        })
      : [];
    const locationsByOrg = new Map<string, typeof locations>();
    for (const loc of locations) {
      const bucket = locationsByOrg.get(loc.organizationId) ?? [];
      bucket.push(loc);
      locationsByOrg.set(loc.organizationId, bucket);
    }
    return memberships.map((m) =>
      toMembershipResponse(m, locationsByOrg.get(m.organizationId) ?? []),
    );
  }
}
