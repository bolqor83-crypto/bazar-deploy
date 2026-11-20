/**
 * Модуль рынка (Промт 17, Часть B).
 */
import { Module } from '@nestjs/common';
import {
  MarketController,
  MarketLocationsController,
} from './market.controller';
import { MarketService } from './market.service';

@Module({
  controllers: [MarketController, MarketLocationsController],
  providers: [MarketService],
  exports: [MarketService],
})
export class MarketModule {}
