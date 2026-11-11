/**
 * Сервис организаций (Промт 7).
 *
 * Проверка прав — на сервере: список и детали доступны только
 * участникам организации, точки создаёт только владелец розничной
 * организации (STORE_OWNER).
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppLogger } from '../common/app-logger';
import { ApiError } from '../common/filters/api-error';
import { toLocationResponse, toOrganizationResponse } from '../common/mappers';
import type {
  CreateLocationDto,
  CreateOrganizationDto,
} from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Создание организации: текущий пользователь становится участником
   * с ролью владельца контура (STORE_OWNER для розницы,
   * WHOLESALE_SELLER для опта, CARRIER для логистики).
   */
  async create(
    userId: string,
    dto: CreateOrganizationDto,
  ): Promise<ReturnType<typeof toOrganizationResponse> & { role: string }> {
    const ownerRole = ownerRoleForType(dto.type);
    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
        memberships: {
          create: { userId, role: ownerRole },
        },
      },
      include: { memberships: true, locations: true },
    });
    this.logger.event('organization.created', {
      userId,
      organizationId: organization.id,
      type: dto.type,
    });
    return {
      ...toOrganizationResponse(organization),
      role: ownerRole.toLowerCase(),
    };
  }

  /**
   * Детали организации: точки и участники. Доступно только
   * участникам — чужая организация не видна (404 без раскрытия).
   */
  async getForUser(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, organizationId },
    });
    if (!membership) {
      // Не раскрываем существование чужой организации.
      throw new ApiError(404, 'ORG_NOT_FOUND', 'Организация не найдена');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        memberships: { include: { user: true }, orderBy: { createdAt: 'asc' } },
        locations: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!organization) {
      throw new ApiError(404, 'ORG_NOT_FOUND', 'Организация не найдена');
    }

    return {
      ...toOrganizationResponse(organization),
      members: organization.memberships.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role.toLowerCase(),
        name: m.user.name,
        phone: m.user.phone,
        createdAt: m.createdAt.toISOString(),
      })),
      locations: organization.locations.map(toLocationResponse),
    };
  }

  /**
   * Создание точки: только для RETAIL-организаций и только
   * владельцу контура (STORE_OWNER).
   *
   * Порядок проверок: существование (404 всем) → членство (чужим
   * 404 без раскрытия) → тип организации (400) → роль (403).
   */
  async createLocation(
    userId: string,
    organizationId: string,
    dto: CreateLocationDto,
  ): Promise<ReturnType<typeof toLocationResponse>> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new ApiError(404, 'ORG_NOT_FOUND', 'Организация не найдена');
    }

    const anyMembership = await this.prisma.membership.findFirst({
      where: { userId, organizationId },
    });
    if (!anyMembership) {
      // Чужая организация: не раскрываем существование.
      throw new ApiError(404, 'ORG_NOT_FOUND', 'Организация не найдена');
    }
    if (organization.type !== 'RETAIL') {
      throw new ApiError(
        400,
        'ORG_NOT_RETAIL',
        'Точки создаются только у розничных организаций',
      );
    }
    if (anyMembership.role !== 'STORE_OWNER') {
      throw new ApiError(
        403,
        'ORG_FORBIDDEN',
        'Точки создаёт только владелец организации',
      );
    }

    const location = await this.prisma.businessLocation.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        address: dto.address.trim(),
        city: dto.city.trim(),
      },
    });
    this.logger.event('location.created', {
      userId,
      organizationId,
      locationId: location.id,
    });
    return toLocationResponse(location);
  }

  /** Список точек организации — участникам. */
  async listLocations(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, organizationId },
    });
    if (!membership) {
      throw new ApiError(404, 'ORG_NOT_FOUND', 'Организация не найдена');
    }
    const locations = await this.prisma.businessLocation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
    return locations.map(toLocationResponse);
  }

  /** Детали точки — участникам организации точки. */
  async getLocationForUser(userId: string, locationId: string) {
    const location = await this.prisma.businessLocation.findUnique({
      where: { id: locationId },
    });
    if (!location) {
      throw new ApiError(404, 'LOCATION_NOT_FOUND', 'Точка не найдена');
    }
    const membership = await this.prisma.membership.findFirst({
      where: { userId, organizationId: location.organizationId },
    });
    if (!membership) {
      throw new ApiError(404, 'LOCATION_NOT_FOUND', 'Точка не найдена');
    }
    return toLocationResponse(location);
  }
}

/** Роль владельца контура по типу организации. */
function ownerRoleForType(
  type: CreateOrganizationDto['type'],
): 'STORE_OWNER' | 'WHOLESALE_SELLER' | 'CARRIER' {
  switch (type) {
    case 'WHOLESALE':
      return 'WHOLESALE_SELLER';
    case 'LOGISTICS':
      return 'CARRIER';
    default:
      return 'STORE_OWNER';
  }
}
