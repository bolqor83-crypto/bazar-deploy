/**
 * Контроллер организаций: /api/organizations.
 *
 * Все маршруты требуют Bearer access-JWT (глобальный guard).
 * Проверка членства — в сервисе (права на сервере).
 */
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrganizationsService } from './organizations.service';
import { MembershipsService } from '../memberships/memberships.service';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import {
  CreateLocationDto,
  CreateOrganizationDto,
} from './dto/organization.dto';

@ApiTags('Организации')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly memberships: MembershipsService,
  ) {}

  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Создать организацию (текущий пользователь — владелец)',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizations.create(user.userId, dto);
  }

  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Get()
  @ApiOperation({ summary: 'Организации текущего пользователя' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.memberships.listForUser(user.userId);
  }

  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Get(':id')
  @ApiOperation({ summary: 'Детали организации (участникам)' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') organizationId: string,
  ) {
    return this.organizations.getForUser(user.userId, organizationId);
  }

  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Post(':id/locations')
  @HttpCode(201)
  @ApiOperation({ summary: 'Создать точку (RETAIL + STORE_OWNER)' })
  createLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') organizationId: string,
    @Body() dto: CreateLocationDto,
  ) {
    return this.organizations.createLocation(user.userId, organizationId, dto);
  }

  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Get(':id/locations')
  @ApiOperation({ summary: 'Точки организации (участникам)' })
  listLocations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') organizationId: string,
  ) {
    return this.organizations.listLocations(user.userId, organizationId);
  }
}
