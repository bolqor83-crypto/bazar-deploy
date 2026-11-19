/**
 * Модуль запросов цены (Промт 16, Часть C).
 */
import { Module } from '@nestjs/common';
import { PriceRequestController } from './price-request.controller';
import { PriceRequestService } from './price-request.service';

@Module({
  controllers: [PriceRequestController],
  providers: [PriceRequestService],
  exports: [PriceRequestService],
})
export class PriceRequestsModule {}
