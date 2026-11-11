/**
 * Контроллер торговых точек: /api/locations/:id.
 *
 * Создание и списки — в контексте организации
 * (/api/organizations/:id/locations). Здесь только чтение детали.
 */
import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrganizationsService } from '../organizations/organizations.service';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('Точки')
@ApiBearerAuth()
@Controller('locations')
export class LocationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @Get(':id')
  @ApiOperation({ summary: 'Детали точки (участникам организации)' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') locationId: string) {
    return this.organizations.getLocationForUser(user.userId, locationId);
  }
}
