/**
 * Модуль членств: используется организациями и профилем пользователя.
 */
import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service';

@Module({
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
