/**
 * Модуль торговых точек.
 */
import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { LocationsController } from './locations.controller';

@Module({
  imports: [OrganizationsModule],
  controllers: [LocationsController],
})
export class LocationsModule {}
