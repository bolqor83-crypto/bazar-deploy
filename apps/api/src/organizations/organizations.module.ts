/**
 * Модуль организаций: создание и чтение организаций и точек.
 */
import { Module } from '@nestjs/common';
import { AppLogger } from '../common/app-logger';
import { MembershipsModule } from '../memberships/memberships.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [MembershipsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, AppLogger],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
